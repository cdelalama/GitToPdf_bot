import { GrammyError } from "grammy";
import { MyContext } from "../types/context";
import { config } from "../config/config";

export async function deleteMessages(ctx: MyContext, messageIds: number[]) {
    if (ctx.chat && messageIds) {
        for (let i = messageIds.length - 1; i >= 0; i--) {
            const messageId = messageIds[i];
            if (
                ctx.session.botMessageIds?.includes(messageId) ||
                ctx.session.userMessageIds?.includes(messageId)
            ) {
                try {
                    await ctx.api.deleteMessage(ctx.chat.id, messageId);
                } catch (error) {
                    if (
                        error instanceof GrammyError &&
                        error.description === "Bad Request: message to delete not found"
                    ) {
                        console.log(`Message ID ${messageId} was not found, skipping deletion.`);
                    } else {
                        console.error(`Failed to delete message ID ${messageId}: ${error}`);
                    }
                } finally {
                    // Limpiar IDs de mensajes de la sesión
                    if (ctx.session.botMessageIds) {
                        ctx.session.botMessageIds = ctx.session.botMessageIds.filter(
                            (id) => id !== messageId
                        );
                    }
                    if (ctx.session.userMessageIds) {
                        ctx.session.userMessageIds = ctx.session.userMessageIds.filter(
                            (id) => id !== messageId
                        );
                    }
                }
            }
        }
    }
}

export async function deleteMessageAfterTimeout(
    ctx: MyContext,
    chatId: number,
    messageId: number,
    timeout: number
) {
    setTimeout(async () => {
        try {
            await ctx.api.deleteMessage(chatId, messageId);
            // Actualizar la sesión para remover el ID del mensaje
            if (ctx.session.botMessageIds) {
                ctx.session.botMessageIds = ctx.session.botMessageIds.filter(
                    (id) => id !== messageId
                );
            }
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    }, timeout);
}

export async function notifyAdmin(ctx: MyContext, action: string): Promise<void> {
    try {
        const adminId = config.adminId;
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
        
    } catch (error) {
        console.error("Error notifying admin:", error);
    }
} 