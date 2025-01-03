"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGeneratePdf = handleGeneratePdf;
exports.handleCancel = handleCancel;
exports.handleApproveUser = handleApproveUser;
exports.handleRejectUser = handleRejectUser;
const grammy_1 = require("grammy");
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const githubToPdf_1 = require("../modules/githubToPdf");
const database_1 = require("../utils/database");
const messages_1 = require("../utils/messages");
async function handleGeneratePdf(ctx) {
    if (!ctx.callbackQuery?.data || !ctx.from)
        return;
    let pdfPath = null;
    const startTime = Date.now();
    const githubUrl = ctx.callbackQuery.data.replace('generate_pdf:', '');
    const userId = ctx.from.id;
    try {
        await (0, messages_1.deleteMessages)(ctx, [...(ctx.session.botMessageIds || []), ...(ctx.session.userMessageIds || [])]);
        const response = await ctx.reply("Cloning repository and generating PDF. Please wait...");
        ctx.session.botMessageIds = [response.message_id];
        if (ctx.chat?.id) {
            (0, messages_1.deleteMessageAfterTimeout)(ctx, ctx.chat.id, response.message_id, 3000);
        }
        if (!githubUrl.startsWith('https://github.com')) {
            throw new Error("Invalid GitHub URL");
        }
        pdfPath = await (0, githubToPdf_1.githubToPdf)(githubUrl);
        const pdfSize = fs.statSync(pdfPath).size;
        await Promise.all([
            database_1.Database.logRepoProcess({
                telegram_user_id: userId,
                repo_url: githubUrl,
                status: 'success',
                pdf_size: pdfSize,
                processing_time: Date.now() - startTime
            }),
            database_1.Database.incrementPdfCount(userId)
        ]);
        const fileStream = fs.createReadStream(pdfPath);
        await ctx.replyWithDocument(new grammy_1.InputFile(fileStream, path_1.default.basename(pdfPath)));
        fileStream.close();
    }
    catch (error) {
        await database_1.Database.logRepoProcess({
            telegram_user_id: userId,
            repo_url: githubUrl,
            status: 'failed',
            error_message: error.message
        });
        const errorMsg = await ctx.reply(`Error: ${error.message || "Unknown error occurred"}. Please try again.`);
        ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), errorMsg.message_id];
    }
    finally {
        if (pdfPath && fs.existsSync(pdfPath)) {
            try {
                fs.unlinkSync(pdfPath);
                console.log("Temporary PDF file deleted:", pdfPath);
            }
            catch (error) {
                console.error("Error deleting PDF file:", error);
            }
        }
    }
}
async function handleCancel(ctx) {
    try {
        await (0, messages_1.deleteMessages)(ctx, [...(ctx.session.botMessageIds || []), ...(ctx.session.userMessageIds || [])]);
        await ctx.answerCallbackQuery("Operation cancelled");
    }
    catch (error) {
        console.error("Error cancelling operation:", error);
        await ctx.answerCallbackQuery();
    }
}
async function handleApproveUser(ctx) {
    if (!ctx.callbackQuery?.data || !ctx.from)
        return;
    const userId = Number(ctx.callbackQuery.data.replace('approve_user:', ''));
    try {
        await database_1.Database.updateUserStatus(userId, 'active');
        await ctx.editMessageText("✅ User approved successfully!\n\n" +
            "Original message:\n" +
            ctx.callbackQuery.message?.text || '');
        // Notificar al usuario que ha sido aprobado
        await ctx.api.sendMessage(userId, "✅ Your access request has been approved! You can now use the bot.");
    }
    catch (error) {
        console.error("Error approving user:", error);
        await ctx.answerCallbackQuery("Error approving user");
    }
}
async function handleRejectUser(ctx) {
    if (!ctx.callbackQuery?.data || !ctx.from)
        return;
    const userId = Number(ctx.callbackQuery.data.replace('reject_user:', ''));
    try {
        await database_1.Database.updateUserStatus(userId, 'banned');
        await ctx.editMessageText("❌ User rejected!\n\n" +
            "Original message:\n" +
            ctx.callbackQuery.message?.text || '');
        // Notificar al usuario que ha sido rechazado
        await ctx.api.sendMessage(userId, "❌ Your access request has been denied. Contact the administrator for more information.");
    }
    catch (error) {
        console.error("Error rejecting user:", error);
        await ctx.answerCallbackQuery("Error rejecting user");
    }
}
