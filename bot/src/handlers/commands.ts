import { MyContext } from "../types/context";
import { InlineKeyboard } from "grammy";
import { config } from "../config/config";
import { Database } from "../utils/database";

export async function handleStart(ctx: MyContext) {
    try {
        console.log("Received start command from:", ctx.from?.username);
        
        const user = await Database.getUser(ctx.from?.id || 0);
        const isAdmin = user?.is_admin || false;
        console.log("Is admin?", isAdmin, "User:", user);
        
        const keyboard = isAdmin ? new InlineKeyboard().webApp("⚙️ Admin Dashboard", config.webAppUrl) : undefined;
        
        await ctx.reply(
            "Welcome to GitToPDFBot! 📚\n\n" +
            "I convert GitHub repositories into PDF documents, making it easy to:\n" +
            "• Read code offline\n" +
            "• Share code documentation\n" +
            "• Review repositories\n" +
            "• Feed code context to LLMs (ChatGPT, Claude, etc.)\n\n" +
            "Just send me a GitHub repository URL and I'll generate a PDF with its contents.\n\n" +
            "🔜 Coming soon: Direct integration with ChatGPT to analyze repositories!\n\n" +
            "Example: https://github.com/username/repository" +
            (isAdmin ? "\n\n🔐 Admin: Use the dashboard to manage users and monitor bot usage." : ""),
            { reply_markup: keyboard }
        );
    } catch (error) {
        console.error("Error in start command:", error);
    }
}

export async function handleWebApp(ctx: MyContext) {
    try {
        const user = await Database.getUser(ctx.from?.id || 0);
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
                        web_app: { url: config.webAppUrl }
                    }
                ]]
            }
        });
    } catch (error) {
        console.error("Error in web app command:", error);
    }
} 