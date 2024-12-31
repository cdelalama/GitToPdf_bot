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
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env file
dotenv.config();
// Check if bot token exists
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}
// Initialize bot with token
const bot = new grammy_1.Bot(token);
// Command handlers
bot.command("start", async (ctx) => {
    try {
        console.log("Received start command from:", ctx.from?.username);
        await ctx.reply("Welcome to my basic GrammY bot!");
    }
    catch (error) {
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
    drop_pending_updates: true // Esto evita que el bot procese mensajes antiguos al iniciar
});
