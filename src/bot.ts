import { Bot } from "grammy";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Check if bot token exists
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}

// Initialize bot with token
const bot = new Bot(token);

// Command handlers
bot.command("start", async (ctx) => {
    try {
        console.log("Received start command from:", ctx.from?.username);
        await ctx.reply("Welcome to my basic GrammY bot!");
    } catch (error) {
        console.error("Error in start command:", error);
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
    drop_pending_updates: true // Esto evita que el bot procese mensajes antiguos al iniciar
});