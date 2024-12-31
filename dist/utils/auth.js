"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserAuthorized = isUserAuthorized;
exports.handleUnauthorized = handleUnauthorized;
const config_1 = require("../config/config");
const messages_1 = require("./messages");
const database_1 = require("./database");
async function isUserAuthorized(ctx) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username?.toLowerCase();
    if (!userId) {
        console.log("No user ID found in context");
        return false;
    }
    // Verificar si el usuario existe en la base de datos
    let user = await database_1.Database.getUser(userId);
    // Si el usuario no existe, crearlo como pendiente
    if (!user) {
        user = await database_1.Database.createUser({
            telegram_id: userId,
            telegram_username: username || undefined,
            first_name: ctx.from?.first_name || 'Unknown',
            last_name: ctx.from?.last_name,
            language_code: ctx.from?.language_code
        });
    }
    // Actualizar última interacción
    await database_1.Database.updateLastInteraction(userId);
    // Verificar estado del usuario
    if (user?.status === 'active') {
        return true;
    }
    // Si es admin, activar automáticamente
    if (userId === config_1.config.adminId) {
        await database_1.Database.updateUserStatus(userId, 'active');
        return true;
    }
    return false;
}
async function handleUnauthorized(ctx) {
    try {
        const username = ctx.from?.username;
        const response = await ctx.reply(`Sorry @${username}, this bot is private. ` +
            `Contact the administrator if you need access.`);
        // Notificar al administrador
        await (0, messages_1.notifyAdmin)(ctx, "Bot Access Attempt");
        // Borrar el mensaje después de 5 segundos
        if (ctx.chat?.id && response.message_id) {
            setTimeout(async () => {
                try {
                    await ctx.api.deleteMessage(ctx.chat.id, response.message_id);
                }
                catch (error) {
                    console.error("Error deleting unauthorized message:", error);
                }
            }, 5000);
        }
    }
    catch (error) {
        console.error("Error handling unauthorized access:", error);
    }
}
