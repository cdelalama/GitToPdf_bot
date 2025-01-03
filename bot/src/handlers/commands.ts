import { MyContext } from "../types/context";
import { config } from "../config/config";
import { Database } from "../utils/database";

export async function handleStart(ctx: MyContext) {
    try {
        const userId = ctx.from?.id;
        if (!userId) return;

        const user = await Database.getUser(userId);
        const username = ctx.from?.username;
        const baseMessage = `👋 Hello${username ? ` @${username}` : ''}!\n\n` +
            `This bot converts GitHub repositories into PDF documents, making it easy to read and share code offline. ` +
            `Perfect for code reviews, documentation, and feeding context to AI tools like ChatGPT!\n\n` +
            `Just send me a GitHub repository URL and I'll convert it to a PDF for you.`;

        if (user?.is_admin) {
            console.log(`User ${userId} is admin, showing WebApp button`);
            await ctx.reply(baseMessage, {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: "🌐 Open Web App",
                            web_app: { url: config.webAppUrl }
                        }
                    ]]
                }
            });
        } else {
            console.log(`User ${userId} is not admin, showing regular message`);
            await ctx.reply(baseMessage);
        }
    } catch (error) {
        console.error("Error in start command:", error);
    }
}

export async function handleWebApp(ctx: MyContext) {
    try {
        await ctx.reply("⚠️ This command is deprecated. The Web App button is now available in the /start message for admin users.");
    } catch (error) {
        console.error("Error in web app command:", error);
    }
} 