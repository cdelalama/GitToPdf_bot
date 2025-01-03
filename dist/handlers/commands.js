"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStart = handleStart;
exports.handleWebApp = handleWebApp;
const grammy_1 = require("grammy");
const config_1 = require("../config/config");
async function handleStart(ctx) {
    try {
        console.log("Received start command from:", ctx.from?.username);
        const keyboard = new grammy_1.InlineKeyboard()
            .webApp("🌐 Open Web App", config_1.config.webAppUrl);
        await ctx.reply("Welcome to GitToPDFBot! 📚\n\n" +
            "I convert GitHub repositories into PDF documents, making it easy to:\n" +
            "• Read code offline\n" +
            "• Share code documentation\n" +
            "• Review repositories\n" +
            "• Feed code context to LLMs (ChatGPT, Claude, etc.)\n\n" +
            "Just send me a GitHub repository URL and I'll generate a PDF with its contents.\n\n" +
            "🔜 Coming soon: Direct integration with ChatGPT to analyze repositories!\n\n" +
            "Example: https://github.com/username/repository\n\n" +
            "You can also use our Web Interface for a better experience!", { reply_markup: keyboard });
    }
    catch (error) {
        console.error("Error in start command:", error);
    }
}
async function handleWebApp(ctx) {
    try {
        await ctx.reply("Open our Web Interface:", {
            reply_markup: {
                inline_keyboard: [[
                        {
                            text: "🌐 Open Web App",
                            web_app: { url: config_1.config.webAppUrl }
                        }
                    ]]
            }
        });
    }
    catch (error) {
        console.error("Error in web app command:", error);
    }
}
