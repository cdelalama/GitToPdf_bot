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
        await ctx.reply("Welcome to GitToPDFBot! Use /generatepdf <GitHub URL> to generate a PDF from a repository.");
    }
    catch (error) {
        console.error("Error in start command:", error);
    }
});
bot.command("generatepdf", async (ctx) => {
    const repoUrl = ctx.message?.text?.split(" ")[1];
    if (!repoUrl) {
        await ctx.reply("Please provide a GitHub repository URL. Example: /generatepdf https://github.com/user/repo.git");
        return;
    }
    try {
        console.log("Starting PDF generation for URL:", repoUrl);
        await ctx.reply("Cloning repository and generating PDF. Please wait...");
        const pdfPath = await (0, githubToPdf_1.githubToPdf)(repoUrl);
        console.log("PDF generated successfully at:", pdfPath);
        if (!fs.existsSync(pdfPath)) {
            console.error("PDF file not found at path:", pdfPath);
            throw new Error("Generated PDF file not found");
        }
        const fileStream = fs.createReadStream(pdfPath);
        console.log("Sending document to user...");
        await ctx.replyWithDocument(new grammy_1.InputFile(fileStream, path_1.default.basename(pdfPath)));
        fileStream.close();
        console.log("Document sent successfully");
    }
    catch (error) {
        console.error("Detailed error in generatepdf command:", error);
        await ctx.reply(`Error: ${error.message || "Unknown error occurred while generating the PDF"}. Please try again.`);
    }
});
// Message handlers
bot.on("message", async (ctx) => {
    try {
        console.log("Received message from:", ctx.from?.username);
        console.log("Message content:", ctx.message);
        if (ctx.message.text) {
            await ctx.reply(`You said: ${ctx.message.text}`);
        }
    }
    catch (error) {
        console.error("Error processing message:", error);
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
