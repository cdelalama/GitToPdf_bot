import { MyContext } from "../types/context";
import { config } from "../config/config";
import { notifyAdmin } from "./messages";
import { Database } from "./database";

export async function isUserAuthorized(ctx: MyContext): Promise<boolean> {
    const userId = ctx.from?.id;
    const username = ctx.from?.username?.toLowerCase();

    if (!userId) {
        console.log("No user ID found in context");
        return false;
    }

    // Verificar si el usuario existe en la base de datos
    let user = await Database.getUser(userId);
    
    // Si el usuario no existe, crearlo como pendiente
    if (!user) {
        user = await Database.createUser({
            telegram_id: userId,
            telegram_username: username || undefined,
            first_name: ctx.from?.first_name || 'Unknown',
            last_name: ctx.from?.last_name,
            language_code: ctx.from?.language_code
        });
    }

    // Actualizar última interacción
    await Database.updateLastInteraction(userId);

    // Verificar estado del usuario
    if (user?.status === 'active') {
        return true;
    }

    // Si es admin, activar automáticamente
    if (userId === config.adminId) {
        await Database.updateUserStatus(userId, 'active');
        return true;
    }

    return false;
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