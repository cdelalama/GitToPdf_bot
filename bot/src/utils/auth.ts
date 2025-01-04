import { MyContext } from "../types/context";
import { config } from "../config/config";
import { notifyAdmin } from "./messages";
import { Database } from "./database";

export async function isUserAuthorized(ctx: MyContext): Promise<boolean> {
    const userId = ctx.from?.id;
    console.log("Checking authorization for user:", userId);

    if (!userId) {
        console.log("No user ID found in context");
        return false;
    }

    // Verificar si el usuario existe en la base de datos
    let user = await Database.getUser(userId);
    console.log("User from database:", user);
    
    // Si el usuario no existe, crearlo como pendiente
    if (!user) {
        user = await Database.createUser({
            telegram_id: userId,
            telegram_username: ctx.from?.username?.toLowerCase() || undefined,
            first_name: ctx.from?.first_name || 'Unknown',
            last_name: ctx.from?.last_name,
            language_code: ctx.from?.language_code
        });
    }

    // Actualizar última interacción
    await Database.updateLastInteraction(userId);

    // Si es admin o está activo, permitir acceso
    if (user?.is_admin || user?.status === 'active') {
        return true;
    }

    return false;
}

export async function handleUnauthorized(ctx: MyContext): Promise<void> {
    try {
        console.log("Handling unauthorized access for user:", ctx.from?.id);
        const username = ctx.from?.username;
        const response = await ctx.reply(
            `👋 Hello${username ? ` @${username}` : ''}!\n\n` +
            `This bot converts GitHub repositories into PDF documents, making it easy to read and share code offline. ` +
            `Perfect for code reviews, documentation, and feeding context to AI tools like ChatGPT!\n\n` +
            `🔒 For security reasons, access is restricted. I've sent your access request to the administrator.\n\n` +
            `⏳ Please wait for approval. You'll receive a notification when your request is processed.`
        );
        
        console.log("Sending admin notification...");
        await notifyAdmin(ctx, "Bot Access Request");
        
        // Borrar el mensaje después de 30 segundos
        if (ctx.chat?.id && response.message_id) {
            setTimeout(async () => {
                try {
                    await ctx.api.deleteMessage(ctx.chat!.id, response.message_id);
                } catch (error) {
                    console.error("Error deleting unauthorized message:", error);
                }
            }, 30000); // Aumentado a 30 segundos para dar tiempo a leer
        }
    } catch (error) {
        console.error("Error handling unauthorized access:", error);
    }
} 