import { GrammyError } from "grammy";
import { MyContext } from "../types/context";
import { config } from "../config/config";
import { InlineKeyboard } from "grammy";
import { Database } from "./database";
import { supabase } from "./database";

export async function deleteMessages(ctx: MyContext, messageIds: number[]): Promise<void> {
    if (!ctx.chat) return;
    
    for (const messageId of messageIds) {
        try {
            await ctx.api.deleteMessage(ctx.chat.id, messageId);
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    }
}

export function deleteMessageAfterTimeout(ctx: MyContext, chatId: number, messageId: number, timeout: number): void {
    setTimeout(async () => {
        try {
            await ctx.api.deleteMessage(chatId, messageId);
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    }, timeout);
}

export async function notifyAdmin(ctx: MyContext, type: "Bot Access Request" | "Error Report"): Promise<void> {
    try {
        // Obtener todos los administradores
        const { data: admins } = await supabase
            .from('users_git2pdf_bot')
            .select('telegram_id')
            .eq('is_admin', true);

        if (!admins || admins.length === 0) {
            console.error('No administrators found in the database');
            return;
        }

        const user = ctx.from;
        if (!user) return;

        const message = type === "Bot Access Request" 
            ? `🔔 New Bot Access Request\n\n` +
              `From: ${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` +
              `${user.username ? ` (@${user.username})` : ''}\n` +
              `ID: ${user.id}\n\n` +
              `Use /approve ${user.id} to grant access or /reject ${user.id} to deny it.`
            : `⚠️ Error Report\n\n` +
              `From: ${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` +
              `${user.username ? ` (@${user.username})` : ''}\n` +
              `ID: ${user.id}`;

        // Notificar a todos los administradores
        for (const admin of admins) {
            try {
                await ctx.api.sendMessage(admin.telegram_id, message);
            } catch (error) {
                console.error(`Error notifying admin ${admin.telegram_id}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in notifyAdmin:', error);
    }
} 