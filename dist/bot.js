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
// Check if bot token exists
if (!config_1.config.telegramToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}
// Initialize bot with token
const bot = new grammy_1.Bot(config_1.config.telegramToken);
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
// Función para validar URL de GitHub
async function isValidGithubRepo(url) {
    try {
        const apiUrl = url
            .replace(/\.git$/, '') // Remover .git si existe
            .replace('github.com', 'api.github.com/repos');
        console.log("Checking repository at:", apiUrl);
        const response = await fetch(apiUrl);
        const isValid = response.status === 200;
        console.log("Repository validation result:", isValid);
        return isValid;
    }
    catch (error) {
        console.error("Error validating repository:", error);
        return false;
    }
}
// Función para extraer URLs de GitHub del texto
function extractGithubUrl(text) {
    // Remover @ si existe al principio
    text = text.replace(/^@/, '');
    // Regex mejorada para URLs de GitHub
    const githubRegex = /https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/;
    const matches = text.match(githubRegex);
    if (matches) {
        let url = matches[0];
        // Asegurarnos de que la URL es correcta
        url = url.replace(/\.git$/, ''); // Primero removemos .git si existe
        url = url + '.git'; // Luego lo añadimos de forma consistente
        console.log("Extracted GitHub URL:", url);
        return url;
    }
    return null;
}
// Message handlers
bot.on("message:text", async (ctx) => {
    try {
        let text = ctx.message.text.trim();
        const githubUrl = extractGithubUrl(text);
        if (githubUrl) {
            console.log("Detected GitHub URL:", githubUrl);
            if (await isValidGithubRepo(githubUrl)) {
                const keyboard = new grammy_1.InlineKeyboard()
                    .text("Generate PDF", `generate_pdf:${githubUrl}`)
                    .text("Cancel", `cancel:${githubUrl}`);
                await ctx.reply("I detected a GitHub repository. Would you like to generate a PDF?", {
                    reply_to_message_id: ctx.message.message_id,
                    reply_markup: keyboard
                });
            }
            else {
                await ctx.reply("This GitHub repository doesn't seem to be accessible. Please check the URL and try again.");
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
        await ctx.answerCallbackQuery();
        await ctx.reply("Cloning repository and generating PDF. Please wait...");
        if (!githubUrl.startsWith('https://github.com')) {
            throw new Error("Invalid GitHub URL");
        }
        pdfPath = await (0, githubToPdf_1.githubToPdf)(githubUrl);
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
        await ctx.reply(`Error: ${error.message || "Unknown error occurred"}. Please try again.`);
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
    await ctx.answerCallbackQuery("Operation cancelled");
    await ctx.reply("Operation cancelled.");
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
