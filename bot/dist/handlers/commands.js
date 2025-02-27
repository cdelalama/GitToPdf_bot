"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStart = handleStart;
exports.handleWebApp = handleWebApp;
const grammy_1 = require("grammy");
const config_1 = require("../config/config");
const database_1 = require("../utils/database");
const dynamicConfig_1 = require("../utils/dynamicConfig");
async function handleStart(ctx) {
    try {
        console.log("Received start command from:", ctx.from?.username);
        const user = await database_1.Database.getUser(ctx.from?.id || 0);
        const isAdmin = user?.is_admin || false;
        console.log("Is admin?", isAdmin, "User:", user);
        const keyboard = isAdmin ? new grammy_1.InlineKeyboard().webApp("⚙️ Admin Dashboard", config_1.config.webAppUrl) : undefined;
        const welcomeMessage = await dynamicConfig_1.DynamicConfig.get('WELCOME_MESSAGE', "Welcome to GitToPDFBot! 📚\n\n" +
            "I convert GitHub repositories into PDF documents, making it easy to:\n" +
            "• Read code offline\n" +
            "• Share code documentation\n" +
            "• Review repositories\n" +
            "• Feed code context to LLMs (ChatGPT, Claude, etc.)\n\n" +
            "Just send me a GitHub repository URL and I'll generate a PDF with its contents.\n\n" +
            "🔜 Coming soon: Direct integration with ChatGPT to analyze repositories!\n\n" +
            "Example: https://github.com/username/repository" +
            (isAdmin ? "\n\n🔐 Admin: Use the dashboard to manage users and monitor bot usage." : ""));
        await ctx.reply(welcomeMessage, { reply_markup: keyboard });
    }
    catch (error) {
        console.error("Error in start command:", error);
        const errorMessage = await dynamicConfig_1.DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        await ctx.reply(errorMessage);
    }
}
async function handleWebApp(ctx) {
    try {
        const user = await database_1.Database.getUser(ctx.from?.id || 0);
        const isAdmin = user?.is_admin || false;
        if (!isAdmin) {
            await ctx.reply("⚠️ This command is only available for administrators.");
            return;
        }
        await ctx.reply("Open Admin Dashboard:", {
            reply_markup: {
                inline_keyboard: [[
                        {
                            text: "⚙️ Admin Dashboard",
                            web_app: { url: config_1.config.webAppUrl }
                        }
                    ]]
            }
        });
    }
    catch (error) {
        console.error("Error in web app command:", error);
        const errorMessage = await dynamicConfig_1.DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        await ctx.reply(errorMessage);
    }
}
