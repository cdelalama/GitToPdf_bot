import { MyContext } from "../types/context";
import { InlineKeyboard } from "grammy";
import { validateGithubRepo, extractGithubUrl } from "../utils/github";

export async function handleTextMessage(ctx: MyContext) {
    try {
        if (!ctx.message?.text) return;
        const messageId = ctx.message.message_id;

        ctx.session.userMessageIds = [...(ctx.session.userMessageIds || []), messageId];
        const text = ctx.message.text.trim();
        const githubUrl = extractGithubUrl(text);
        
        if (githubUrl) {
            await handleGithubUrl(ctx, githubUrl, messageId);
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
}

async function handleGithubUrl(ctx: MyContext, githubUrl: string, messageId: number) {
    console.log("Detected GitHub URL:", githubUrl);
    
    const validation = await validateGithubRepo(githubUrl);
    if (validation.isValid) {
        const keyboard = new InlineKeyboard()
            .text("Generate PDF", `generate_pdf:${githubUrl}`)
            .text("Cancel", `cancel:${githubUrl}`);
        
        const response = await ctx.reply("I detected a GitHub repository. Would you like to generate a PDF?", {
            reply_to_message_id: messageId,
            reply_markup: keyboard
        });
        
        ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
    } else {
        const response = await ctx.reply(validation.error || "Repository validation failed");
        ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
    }
} 