"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTextMessage = handleTextMessage;
const grammy_1 = require("grammy");
const github_1 = require("../utils/github");
async function handleTextMessage(ctx) {
    try {
        if (!ctx.message?.text)
            return;
        const messageId = ctx.message.message_id;
        ctx.session.userMessageIds = [...(ctx.session.userMessageIds || []), messageId];
        const text = ctx.message.text.trim();
        const githubUrl = (0, github_1.extractGithubUrl)(text);
        if (githubUrl) {
            await handleGithubUrl(ctx, githubUrl, messageId);
        }
    }
    catch (error) {
        console.error("Error processing message:", error);
    }
}
async function handleGithubUrl(ctx, githubUrl, messageId) {
    console.log("Detected GitHub URL:", githubUrl);
    const validation = await (0, github_1.validateGithubRepo)(githubUrl);
    if (validation.isValid) {
        const keyboard = new grammy_1.InlineKeyboard()
            .text("Generate PDF", `generate_pdf:${githubUrl}`)
            .text("Cancel", `cancel:${githubUrl}`);
        const response = await ctx.reply("I detected a GitHub repository. Would you like to generate a PDF?", {
            reply_to_message_id: messageId,
            reply_markup: keyboard
        });
        ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
    }
    else {
        const response = await ctx.reply(validation.error || "Repository validation failed");
        ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
    }
}
