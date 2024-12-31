import { Bot, InputFile, InlineKeyboard, session } from "grammy";
import * as dotenv from "dotenv";
import { githubToPdf } from "./modules/githubToPdf";
import { config } from "./config/config";
import * as fs from "fs";
import path from "path";
import { MyContext, initialSession } from "./types/context";
import { deleteMessages, deleteMessageAfterTimeout } from "./utils/messages";
import { validateGithubRepo, extractGithubUrl } from "./utils/github";
import { isUserAuthorized, handleUnauthorized } from "./utils/auth";
import { Database } from "./utils/database";

// Check if bot token exists
if (!config.telegramToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}

// Initialize bot with token
const bot = new Bot<MyContext>(config.telegramToken);

// Configurar el middleware de sesión
bot.use(session({
    initial: () => initialSession
}));

// Middleware de autorización para todos los comandos y mensajes
bot.use(async (ctx, next) => {
    if (await isUserAuthorized(ctx)) {
        await next();
    } else {
        await handleUnauthorized(ctx);
    }
});

// Command handlers
bot.command("start", async (ctx) => {
    try {
        console.log("Received start command from:", ctx.from?.username);
        await ctx.reply(
            "Welcome to GitToPDFBot! 👋\n\n" +
            "Just send me a GitHub repository URL and I'll generate a PDF with its contents.\n\n" +
            "Example: https://github.com/username/repository"
        );
    } catch (error) {
        console.error("Error in start command:", error);
    }
});

// Message handlers
bot.on("message:text", async (ctx) => {
    try {
        ctx.session.userMessageIds = [...(ctx.session.userMessageIds || []), ctx.message.message_id];
        
        let text = ctx.message.text.trim();
        const githubUrl = extractGithubUrl(text);
        
        if (githubUrl) {
            console.log("Detected GitHub URL:", githubUrl);
            
            const validation = await validateGithubRepo(githubUrl);
            if (validation.isValid) {
                const keyboard = new InlineKeyboard()
                    .text("Generate PDF", `generate_pdf:${githubUrl}`)
                    .text("Cancel", `cancel:${githubUrl}`);
                
                const response = await ctx.reply("I detected a GitHub repository. Would you like to generate a PDF?", {
                    reply_to_message_id: ctx.message.message_id,
                    reply_markup: keyboard
                });
                
                ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
            } else {
                const response = await ctx.reply(validation.error || "Repository validation failed");
                ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
            }
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
});

// Manejar callbacks de los botones
bot.callbackQuery(/^generate_pdf:/, async (ctx) => {
    let pdfPath: string | null = null;
    const startTime = Date.now();
    const githubUrl = ctx.callbackQuery.data.replace('generate_pdf:', '');
    
    try {
        console.log("Processing URL in callback:", githubUrl);
        
        // Borrar mensajes anteriores
        await deleteMessages(ctx, [...(ctx.session.botMessageIds || []), ...(ctx.session.userMessageIds || [])]);
        
        const response = await ctx.reply("Cloning repository and generating PDF. Please wait...");
        ctx.session.botMessageIds = [response.message_id];
        
        // Programar el borrado del mensaje después de 3 segundos
        if (ctx.chat?.id) {
            deleteMessageAfterTimeout(ctx, ctx.chat.id, response.message_id, 3000);
        }

        if (!githubUrl.startsWith('https://github.com')) {
            throw new Error("Invalid GitHub URL");
        }
        
        pdfPath = await githubToPdf(githubUrl);
        const pdfSize = fs.statSync(pdfPath).size;
        
        // Registrar en ambas tablas
        await Promise.all([
            Database.logRepoProcess({
                telegram_user_id: ctx.from.id,
                repo_url: githubUrl,
                status: 'success',
                pdf_size: pdfSize,
                processing_time: Date.now() - startTime
            }),
            Database.incrementPdfCount(ctx.from.id)
        ]);
        
        console.log("PDF generated successfully at:", pdfPath);
        
        if (!fs.existsSync(pdfPath)) {
            throw new Error("Generated PDF file not found");
        }

        const fileStream = fs.createReadStream(pdfPath);
        await ctx.replyWithDocument(new InputFile(fileStream, path.basename(pdfPath)));
        fileStream.close();
        
    } catch (error: any) {
        await Database.logRepoProcess({
            telegram_user_id: ctx.from.id,
            repo_url: githubUrl,
            status: 'failed',
            error_message: error.message
        });
        console.error("Error generating PDF:", error);
        const errorMsg = await ctx.reply(`Error: ${error.message || "Unknown error occurred"}. Please try again.`);
        ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), errorMsg.message_id];
    } finally {
        // Limpiar el archivo PDF si existe
        if (pdfPath && fs.existsSync(pdfPath)) {
            try {
                fs.unlinkSync(pdfPath);
                console.log("Temporary PDF file deleted:", pdfPath);
            } catch (error) {
                console.error("Error deleting PDF file:", error);
            }
        }
    }
});

bot.callbackQuery(/^cancel:/, async (ctx) => {
    try {
        await deleteMessages(ctx, [...(ctx.session.botMessageIds || []), ...(ctx.session.userMessageIds || [])]);
        await ctx.answerCallbackQuery("Operation cancelled");
    } catch (error) {
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