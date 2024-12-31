import { MyContext } from "../types/context";
import { config } from "../config/config";
import { notifyAdmin } from "./messages";

export async function isUserAuthorized(ctx: MyContext): Promise<boolean> {
    const userId = ctx.from?.id;
    const username = ctx.from?.username?.toLowerCase();

    if (!userId || !username) {
        console.log("No user ID or username found in context");
        return false;
    }

    // Verificar si el usuario está en la lista de permitidos
    const isAllowed = config.allowedUsers.some(allowed => 
        allowed.toLowerCase() === username || 
        allowed === userId.toString()
    );

    if (!isAllowed) {
        console.log(`Unauthorized access attempt by: ${username} (${userId})`);
    }

    return isAllowed;
}

export async function handleUnauthorized(ctx: MyContext): Promise<void> {
    try {
        const username = ctx.from?.username;
        const response = await ctx.reply(
            `Sorry @${username}, this bot is private. ` +
            `Contact the administrator if you need access.`
        );
        
        // Notificar al administrador
        await notifyAdmin(ctx, "Bot Access Attempt");
        
        // Borrar el mensaje después de 5 segundos
        if (ctx.chat?.id && response.message_id) {
            setTimeout(async () => {
                try {
                    await ctx.api.deleteMessage(ctx.chat!.id, response.message_id);
                } catch (error) {
                    console.error("Error deleting unauthorized message:", error);
                }
            }, 5000);
        }
    } catch (error) {
        console.error("Error handling unauthorized access:", error);
    }
} 