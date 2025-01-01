"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStart = handleStart;
async function handleStart(ctx) {
    try {
        console.log("Received start command from:", ctx.from?.username);
        await ctx.reply("Welcome to GitToPDFBot! 📚\n\n" +
            "I convert GitHub repositories into PDF documents, making it easy to:\n" +
            "• Read code offline\n" +
            "• Share code documentation\n" +
            "• Review repositories\n" +
            "• Feed code context to LLMs (ChatGPT, Claude, etc.)\n\n" +
            "Just send me a GitHub repository URL and I'll generate a PDF with its contents.\n\n" +
            "🔜 Coming soon: Direct integration with ChatGPT to analyze repositories!\n\n" +
            "Example: https://github.com/username/repository");
    }
    catch (error) {
        console.error("Error in start command:", error);
    }
}
