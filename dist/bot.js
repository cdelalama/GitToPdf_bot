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
const grammy_1 = require("grammy");
const githubToPdf_1 = require("./modules/githubToPdf");
const config_1 = require("./config/config");
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const context_1 = require("./types/context");
const messages_1 = require("./utils/messages");
const github_1 = require("./utils/github");
const auth_1 = require("./utils/auth");
const database_1 = require("./utils/database");
// Check if bot token exists
if (!config_1.config.telegramToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}
// Initialize bot with token
const bot = new grammy_1.Bot(config_1.config.telegramToken);
// Configurar el middleware de sesión
bot.use((0, grammy_1.session)({
    initial: () => context_1.initialSession
}));
// Middleware de autorización para todos los comandos y mensajes
bot.use(async (ctx, next) => {
    if (await (0, auth_1.isUserAuthorized)(ctx)) {
        await next();
    }
    else {
        await (0, auth_1.handleUnauthorized)(ctx);
    }
});
// Command handlers
bot.command("start", async (ctx) => {
    try {
        console.log("Received start command from:", ctx.from?.username);
        await ctx.reply("Welcome to GitToPDFBot! 👋\n\n" +
            "Just send me a GitHub repository URL and I'll generate a PDF with its contents.\n\n" +
            "Example: https://github.com/username/repository");
    }
    catch (error) {
        console.error("Error in start command:", error);
    }
});
// Message handlers
bot.on("message:text", async (ctx) => {
    try {
        ctx.session.userMessageIds = [...(ctx.session.userMessageIds || []), ctx.message.message_id];
        let text = ctx.message.text.trim();
        const githubUrl = (0, github_1.extractGithubUrl)(text);
        if (githubUrl) {
            console.log("Detected GitHub URL:", githubUrl);
            const validation = await (0, github_1.validateGithubRepo)(githubUrl);
            if (validation.isValid) {
                const keyboard = new grammy_1.InlineKeyboard()
                    .text("Generate PDF", `generate_pdf:${githubUrl}`)
                    .text("Cancel", `cancel:${githubUrl}`);
                const response = await ctx.reply("I detected a GitHub repository. Would you like to generate a PDF?", {
                    reply_to_message_id: ctx.message.message_id,
                    reply_markup: keyboard
                });
                ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
            }
            else {
                const response = await ctx.reply(validation.error || "Repository validation failed");
                ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
            }
        }
    }
    catch (error) {
        console.error("Error processing message:", error);
    }
});
// Manejar callbacks de los botones
bot.callbackQuery(/^generate_pdf:/, async (ctx) => {
    let pdfPath = null;
    try {
        const githubUrl = ctx.callbackQuery.data.replace('generate_pdf:', '');
        console.log("Processing URL in callback:", githubUrl);
        // Borrar mensajes anteriores
        await (0, messages_1.deleteMessages)(ctx, [...(ctx.session.botMessageIds || []), ...(ctx.session.userMessageIds || [])]);
        const response = await ctx.reply("Cloning repository and generating PDF. Please wait...");
        ctx.session.botMessageIds = [response.message_id];
        // Programar el borrado del mensaje después de 3 segundos
        if (ctx.chat?.id) {
            (0, messages_1.deleteMessageAfterTimeout)(ctx, ctx.chat.id, response.message_id, 3000);
        }
        if (!githubUrl.startsWith('https://github.com')) {
            throw new Error("Invalid GitHub URL");
        }
        pdfPath = await (0, githubToPdf_1.githubToPdf)(githubUrl);
        await database_1.Database.incrementPdfCount(ctx.from.id);
        console.log("PDF generated successfully at:", pdfPath);
        if (!fs.existsSync(pdfPath)) {
            throw new Error("Generated PDF file not found");
        }
        const fileStream = fs.createReadStream(pdfPath);
        await ctx.replyWithDocument(new grammy_1.InputFile(fileStream, path_1.default.basename(pdfPath)));
        fileStream.close();
    }
    catch (error) {
        console.error("Error generating PDF:", error);
        const errorMsg = await ctx.reply(`Error: ${error.message || "Unknown error occurred"}. Please try again.`);
        ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), errorMsg.message_id];
    }
    finally {
        // Limpiar el archivo PDF si existe
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
});
bot.callbackQuery(/^cancel:/, async (ctx) => {
    try {
        await (0, messages_1.deleteMessages)(ctx, [...(ctx.session.botMessageIds || []), ...(ctx.session.userMessageIds || [])]);
        await ctx.answerCallbackQuery("Operation cancelled");
    }
    catch (error) {
        console.error("Error cancelling operation:", error);
        await ctx.answerCallbackQuery();
    }
});
// Error handler
bot.catch((err) => {
    console.error("Bot error occurred:", err);
});
// Start the bot
console.log("Starting bot...");
bot.start({
    onStart: (botInfo) => {
        console.log("Bot started successfully!");
        console.log("Bot username:", botInfo.username);
    },
    drop_pending_updates: true // Avoid processing old messages on bot start
});
