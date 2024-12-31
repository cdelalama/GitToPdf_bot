"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessages = deleteMessages;
exports.deleteMessageAfterTimeout = deleteMessageAfterTimeout;
exports.notifyAdmin = notifyAdmin;
const grammy_1 = require("grammy");
const config_1 = require("../config/config");
async function deleteMessages(ctx, messageIds) {
    if (ctx.chat && messageIds) {
        for (let i = messageIds.length - 1; i >= 0; i--) {
            const messageId = messageIds[i];
            if (ctx.session.botMessageIds?.includes(messageId) ||
                ctx.session.userMessageIds?.includes(messageId)) {
                try {
                    await ctx.api.deleteMessage(ctx.chat.id, messageId);
                }
                catch (error) {
                    if (error instanceof grammy_1.GrammyError &&
                        error.description === "Bad Request: message to delete not found") {
                        console.log(`Message ID ${messageId} was not found, skipping deletion.`);
                    }
                    else {
                        console.error(`Failed to delete message ID ${messageId}: ${error}`);
                    }
                }
                finally {
                    // Limpiar IDs de mensajes de la sesión
                    if (ctx.session.botMessageIds) {
                        ctx.session.botMessageIds = ctx.session.botMessageIds.filter((id) => id !== messageId);
                    }
                    if (ctx.session.userMessageIds) {
                        ctx.session.userMessageIds = ctx.session.userMessageIds.filter((id) => id !== messageId);
                    }
                }
            }
        }
    }
}
async function deleteMessageAfterTimeout(ctx, chatId, messageId, timeout) {
    setTimeout(async () => {
        try {
            await ctx.api.deleteMessage(chatId, messageId);
            // Actualizar la sesión para remover el ID del mensaje
            if (ctx.session.botMessageIds) {
                ctx.session.botMessageIds = ctx.session.botMessageIds.filter((id) => id !== messageId);
            }
        }
        catch (error) {
            console.error("Error deleting message:", error);
        }
    }, timeout);
}
async function notifyAdmin(ctx, action) {
    try {
        const adminId = config_1.config.adminId;
        if (!adminId) {
            console.error("Admin ID not configured");
            return;
        }
        const user = ctx.from;
        const message = ctx.message?.text || 'No message content';
        // Escapar caracteres especiales de Markdown
        const escapedMessage = message.replace(/[_*`[\]()~>#+=|{}.!-]/g, '\\$&');
        const escapedName = `${user?.first_name || ''}${user?.last_name ? ' ' + user?.last_name : ''}`.replace(/[_*`[\]()~>#+=|{}.!-]/g, '\\$&');
        const notification = [
            `🚨 *Unauthorized Access Attempt*`,
            ``,
            `*Action:* ${action}`,
            `*User Info:*`,
            `• ID: \`${user?.id}\``,
            `• Username: @${user?.username || 'no\\_username'}`,
            `• Name: ${escapedName}`,
            `• Language: ${user?.language_code || 'unknown'}`,
            ``,
            `*Message:* \`${escapedMessage}\``,
            ``,
            `_To allow this user, add their ID to ALLOWED\\_USERS in \\.env_`
        ].join('\n');
        await ctx.api.sendMessage(adminId, notification, {
            parse_mode: "MarkdownV2"
        });
    }
    catch (error) {
        console.error("Error notifying admin:", error);
    }
}
