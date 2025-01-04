import { MyContext } from "../types/context";
import { InputFile } from "grammy";
import * as fs from "fs";
import path from "path";
import { githubToPdf } from "../modules/githubToPdf";
import { Database } from "../utils/database";
import { deleteMessages, deleteMessageAfterTimeout } from "../utils/messages";
import { DynamicConfig } from "../utils/dynamicConfig";
import { handleError } from "../utils/errors";

// Control de procesos concurrentes
let currentProcesses = 0;

export async function handleGeneratePdf(ctx: MyContext) {
    if (!ctx.callbackQuery?.data || !ctx.from) return;
    
    let pdfPath: string | null = null;
    const startTime = Date.now();
    const githubUrl = ctx.callbackQuery.data.replace('generate_pdf:', '');
    const userId = ctx.from.id;
    
    try {
        // Verificar límite de procesos concurrentes
        const maxProcesses = await DynamicConfig.get('MAX_CONCURRENT_PROCESSES', 3);
        if (currentProcesses >= maxProcesses) {
            throw new Error('Too many concurrent processes. Please try again later.');
        }
        currentProcesses++;

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
        const pdfSizeMb = pdfSize / (1024 * 1024);
        
        // Verificar tamaño máximo del PDF
        const maxPdfSizeMb = await DynamicConfig.get('MAX_PDF_SIZE_MB', 10);
        if (pdfSizeMb > maxPdfSizeMb) {
            throw new Error(`PDF size (${pdfSizeMb.toFixed(2)}MB) exceeds maximum allowed size (${maxPdfSizeMb}MB)`);
        }
        
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
        await handleError(error, ctx, 'PDF Generation');
        await Database.logRepoProcess({
            telegram_user_id: userId,
            repo_url: githubUrl,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processing_time: Date.now() - startTime
        });
    } finally {
        currentProcesses--;
        if (pdfPath && fs.existsSync(pdfPath)) {
            try {
                fs.unlinkSync(pdfPath);
                console.log("Temporary PDF file deleted:", pdfPath);
            } catch (error) {
                await handleError(error, ctx, 'Cleanup - Delete PDF');
            }
        }
    }
}

export async function handleCancel(ctx: MyContext) {
    try {
        await deleteMessages(ctx, [...(ctx.session.botMessageIds || []), ...(ctx.session.userMessageIds || [])]);
        await ctx.answerCallbackQuery("Operation cancelled");
    } catch (error) {
        await handleError(error, ctx, 'Cancel Operation');
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
        await handleError(error, ctx, 'Approve User');
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
        await handleError(error, ctx, 'Reject User');
    }
} 