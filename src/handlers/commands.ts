import { MyContext } from "../types/context";
import { InlineKeyboard } from "grammy";
import { config } from "../config/config";

export async function handleStart(ctx: MyContext) {
    try {
        console.log("Received start command from:", ctx.from?.username);
        
        const keyboard = new InlineKeyboard()
            .webApp("🌐 Open Web App", config.webAppUrl);
        
        await ctx.reply(
            "Welcome to GitToPDFBot! 📚\n\n" +
            "I convert GitHub repositories into PDF documents, making it easy to:\n" +
            "• Read code offline\n" +
            "• Share code documentation\n" +
            "• Review repositories\n" +
            "• Feed code context to LLMs (ChatGPT, Claude, etc.)\n\n" +
            "Just send me a GitHub repository URL and I'll generate a PDF with its contents.\n\n" +
            "🔜 Coming soon: Direct integration with ChatGPT to analyze repositories!\n\n" +
            "Example: https://github.com/username/repository\n\n" +
            "You can also use our Web Interface for a better experience!",
            { reply_markup: keyboard }
        );
    } catch (error) {
        console.error("Error in start command:", error);
    }
}

export async function handleWebApp(ctx: MyContext) {
    try {
        await ctx.reply("Open our Web Interface:", {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: "🌐 Open Web App",
                        web_app: { url: config.webAppUrl }
                    }
                ]]
            }
        });
    } catch (error) {
        console.error("Error in web app command:", error);
    }
} 