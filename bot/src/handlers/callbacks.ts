import { MyContext } from "../types/context";
import { InputFile } from "grammy";
import * as fs from "fs";
import path from "path";
import { githubToPdf } from "../modules/githubToPdf";
import { Database } from "../utils/database";
import { deleteMessages, deleteMessageAfterTimeout } from "../utils/messages";
import { DynamicConfig } from "../utils/dynamicConfig";

export async function handleGeneratePdf(ctx: MyContext) {
    if (!ctx.callbackQuery?.data || !ctx.from) return;
    
    let pdfPath: string | null = null;
    const startTime = Date.now();
    const githubUrl = ctx.callbackQuery.data.replace('generate_pdf:', '');
    const userId = ctx.from.id;
    
    try {
        await deleteMessages(ctx, [...(ctx.session.botMessageIds || []), ...(ctx.session.userMessageIds || [])]);
        
        const response = await ctx.reply("Cloning repository and generating PDF. Please wait...");
        ctx.session.botMessageIds = [response.message_id];
        
        if (ctx.chat?.id) {
            deleteMessageAfterTimeout(ctx, ctx.chat.id, response.message_id, 3000);
        }

        if (!githubUrl.startsWith('https://github.com')) {
            const invalidUrlMessage = await DynamicConfig.get('INVALID_URL_MESSAGE', '⚠️ Please send a valid GitHub repository URL.');
            throw new Error(invalidUrlMessage);
        }
        
        pdfPath = await githubToPdf(githubUrl);
        const pdfSize = fs.statSync(pdfPath).size;
        
        await Promise.all([
            Database.logRepoProcess({
                telegram_user_id: userId,
                repo_url: githubUrl,
                status: 'success',
                pdf_size: pdfSize,
                processing_time: Date.now() - startTime
            }),
            Database.incrementPdfCount(userId)
        ]);

        const successMessage = await DynamicConfig.get('SUCCESS_MESSAGE', 'Your PDF has been generated successfully!');
        const fileStream = fs.createReadStream(pdfPath);
        await ctx.replyWithDocument(new InputFile(fileStream, path.basename(pdfPath)), {
            caption: successMessage
        });
        fileStream.close();
        
    } catch (error) {
        console.error("Error generating PDF:", error);
        const errorMessage = await DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        const errorMsg = await ctx.reply(errorMessage);
        
        if (errorMsg.message_id) {
            ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), errorMsg.message_id];
        }
    } finally {
        if (pdfPath && fs.existsSync(pdfPath)) {
            try {
                fs.unlinkSync(pdfPath);
                console.log("Temporary PDF file deleted:", pdfPath);
            } catch (error) {
                console.error("Error deleting PDF file:", error);
            }
        }
    }
}

export async function handleCancel(ctx: MyContext) {
    try {
        await deleteMessages(ctx, [...(ctx.session.botMessageIds || []), ...(ctx.session.userMessageIds || [])]);
        await ctx.answerCallbackQuery("Operation cancelled");
    } catch (error) {
        console.error("Error cancelling operation:", error);
        const errorMessage = await DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        await ctx.answerCallbackQuery(errorMessage);
    }
}

export async function handleApproveUser(ctx: MyContext) {
    if (!ctx.callbackQuery?.data || !ctx.from) return;
    
    const userId = Number(ctx.callbackQuery.data.replace('approve_user:', ''));
    try {
        await Database.updateUserStatus(userId, 'active');
        await ctx.editMessageText(
            "✅ User approved successfully!\n\n" +
            "Original message:\n" +
            ctx.callbackQuery.message?.text || ''
        );
        
        // Notificar al usuario que ha sido aprobado
        const approvalMessage = await DynamicConfig.get('APPROVAL_MESSAGE', '✅ Your access request has been approved! You can now use the bot.');
        await ctx.api.sendMessage(userId, approvalMessage);
    } catch (error) {
        console.error("Error approving user:", error);
        const errorMessage = await DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        await ctx.answerCallbackQuery(errorMessage);
    }
}

export async function handleRejectUser(ctx: MyContext) {
    if (!ctx.callbackQuery?.data || !ctx.from) return;
    
    const userId = Number(ctx.callbackQuery.data.replace('reject_user:', ''));
    try {
        await Database.updateUserStatus(userId, 'banned');
        await ctx.editMessageText(
            "❌ User rejected!\n\n" +
            "Original message:\n" +
            ctx.callbackQuery.message?.text || ''
        );
        
        // Notificar al usuario que ha sido rechazado
        const rejectionMessage = await DynamicConfig.get('REJECTION_MESSAGE', '❌ Your access request has been denied. Contact the administrator for more information.');
        await ctx.api.sendMessage(userId, rejectionMessage);
    } catch (error) {
        console.error("Error rejecting user:", error);
        const errorMessage = await DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        await ctx.answerCallbackQuery(errorMessage);
    }
} 