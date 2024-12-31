import { Bot, InputFile } from "grammy";
import * as dotenv from "dotenv";
import { githubToPdf } from "./modules/githubToPdf";
import { config } from "./config/config";
import * as fs from "fs";
import path from "path";

// Check if bot token exists
if (!config.telegramToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}

// Initialize bot with token
const bot = new Bot(config.telegramToken);

// Command handlers
bot.command("start", async (ctx) => {
    try {
        console.log("Received start command from:", ctx.from?.username);
        await ctx.reply("Welcome to GitToPDFBot! Use /generatepdf <GitHub URL> to generate a PDF from a repository.");
    } catch (error) {
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
        
        const pdfPath = await githubToPdf(repoUrl);
        console.log("PDF generated successfully at:", pdfPath);
        
        if (!fs.existsSync(pdfPath)) {
            console.error("PDF file not found at path:", pdfPath);
            throw new Error("Generated PDF file not found");
        }

        const fileStream = fs.createReadStream(pdfPath);
        console.log("Sending document to user...");
        await ctx.replyWithDocument(new InputFile(fileStream, path.basename(pdfPath)));
        fileStream.close();
        console.log("Document sent successfully");
        
    } catch (error: any) {
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
    } catch (error) {
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