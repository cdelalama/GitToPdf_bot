import { GrammyError } from "grammy";
import { MyContext } from "../types/context";
import { config } from "../config/config";
import { InlineKeyboard } from "grammy";

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
        if (!adminId || !ctx.from) return;

        const user = ctx.from;
        const message = ctx.message?.text || 'No message content';
        
        const keyboard = new InlineKeyboard()
            .text("✅ Approve", `approve_user:${user.id}`)
            .text("❌ Reject", `reject_user:${user.id}`);
        
        const notification = [
            `🚨 *New Access Request*`,
            ``,
            `*User Info:*`,
            `• ID: \`${user.id}\``,
            `• Username: @${user.username || 'no\\_username'}`,
            `• Name: ${user.first_name} ${user.last_name || ''}`,
            `• Language: ${user.language_code || 'unknown'}`,
            ``,
            `*Action:* ${action}`,
            `*Message:* \`${message}\``,
        ].join('\n');

        await ctx.api.sendMessage(adminId, notification, {
            parse_mode: "MarkdownV2",
            reply_markup: keyboard
        });
        
    } catch (error) {
        console.error("Error notifying admin:", error);
    }
} 