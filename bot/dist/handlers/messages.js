"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTextMessage = handleTextMessage;
const grammy_1 = require("grammy");
const github_1 = require("../utils/github");
const dynamicConfig_1 = require("../utils/dynamicConfig");
async function handleTextMessage(ctx) {
    try {
        if (!ctx.message?.text)
            return;
        const messageId = ctx.message.message_id;
        const text = ctx.message.text.trim();
        // Guardar ID del mensaje para limpieza posterior
        ctx.session.userMessageIds = [...(ctx.session.userMessageIds || []), messageId];
        // Validar URL de GitHub
        const githubUrl = (0, github_1.extractGithubUrl)(text);
        if (!githubUrl) {
            const invalidUrlMessage = await dynamicConfig_1.DynamicConfig.get('INVALID_URL_MESSAGE', '⚠️ Please send a valid GitHub repository URL.');
            const response = await ctx.reply(invalidUrlMessage);
            // Guardar ID del mensaje de error para limpieza posterior
            if (response.message_id) {
                ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
            }
            return;
        }
        // Validar repositorio
        const validation = await (0, github_1.validateGithubRepo)(githubUrl);
        if (!validation.isValid) {
            const invalidRepoMessage = await dynamicConfig_1.DynamicConfig.get('INVALID_REPO_MESSAGE', '⚠️ This repository is not accessible. Make sure it exists and is public.');
            const response = await ctx.reply(validation.error || invalidRepoMessage);
            // Guardar ID del mensaje de error para limpieza posterior
            if (response.message_id) {
                ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
            }
            return;
        }
        // Mostrar opciones de generación de PDF
        const keyboard = new grammy_1.InlineKeyboard()
            .text("Generate PDF", `generate_pdf:${githubUrl}`)
            .text("Cancel", `cancel:${messageId}`);
        const actionPrompt = await dynamicConfig_1.DynamicConfig.get('ACTION_PROMPT_MESSAGE', 'What would you like to do with this repository?');
        const response = await ctx.reply(actionPrompt, { reply_markup: keyboard });
        // Guardar ID del mensaje para limpieza posterior
        if (response.message_id) {
            ctx.session.botMessageIds = [...(ctx.session.botMessageIds || []), response.message_id];
        }
    }
    catch (error) {
        console.error("Error handling text message:", error);
        const errorMessage = await dynamicConfig_1.DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        await ctx.reply(errorMessage);
    }
}
