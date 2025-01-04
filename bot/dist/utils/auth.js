"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserAuthorized = isUserAuthorized;
exports.handleUnauthorized = handleUnauthorized;
const messages_1 = require("./messages");
const database_1 = require("./database");
const config_1 = require("../config/config");
const dynamicConfig_1 = require("../utils/dynamicConfig");
async function isUserAuthorized(ctx) {
    const userId = ctx.from?.id;
    console.log("Checking authorization for user:", userId);
    if (!userId) {
        console.log("No user ID found in context");
        return false;
    }
    // Verificar si el usuario existe en la base de datos
    let user = await database_1.Database.getUser(userId);
    console.log("User from database:", user);
    // Si el usuario no existe, crearlo y manejar auto-aprobación
    if (!user) {
        user = await database_1.Database.createUser({
            telegram_id: userId,
            telegram_username: ctx.from?.username?.toLowerCase() || undefined,
            first_name: ctx.from?.first_name || 'Unknown',
            last_name: ctx.from?.last_name,
            language_code: ctx.from?.language_code
        });
        // Comprobar auto-aprobación
        try {
            const autoApprove = await config_1.dynamicConfig.getAutoApproveUsers();
            if (autoApprove) {
                console.log(`Auto-approving user ${userId}`);
                await database_1.Database.updateUserStatus(userId, 'active');
                const approvalMessage = await dynamicConfig_1.DynamicConfig.get('APPROVAL_MESSAGE', '✅ Your access request has been approved! You can now use the bot.');
                await ctx.reply(approvalMessage);
                return true;
            }
            else {
                console.log(`User ${userId} needs manual approval`);
                await handleUnauthorized(ctx);
                return false;
            }
        }
        catch (error) {
            console.error("Error in auto-approval process:", error);
            await handleUnauthorized(ctx);
            return false;
        }
    }
    // Actualizar última interacción
    await database_1.Database.updateLastInteraction(userId);
    // Si es admin o está activo, permitir acceso
    if (user?.is_admin || user?.status === 'active') {
        return true;
    }
    return false;
}
async function handleUnauthorized(ctx) {
    try {
        console.log("Handling unauthorized access for user:", ctx.from?.id);
        const username = ctx.from?.username;
        const welcomeMessage = await dynamicConfig_1.DynamicConfig.get('WELCOME_MESSAGE', 'Welcome to Git2PDF Bot! Send me a GitHub repository URL to generate a PDF.');
        const pendingMessage = await dynamicConfig_1.DynamicConfig.get('PENDING_MESSAGE', '⏳ Your access request is being reviewed. You will be notified when processed.');
        const response = await ctx.reply(`👋 Hello${username ? ` @${username}` : ''}!\n\n` +
            welcomeMessage + '\n\n' +
            `🔒 For security reasons, access is restricted. I've sent your access request to the administrator.\n\n` +
            pendingMessage);
        console.log("Sending admin notification...");
        await (0, messages_1.notifyAdmin)(ctx, "Bot Access Request");
        // Borrar el mensaje después del tiempo configurado
        if (ctx.chat?.id && response.message_id) {
            const deleteTimeout = await config_1.dynamicConfig.getDeleteMessageTimeout();
            console.log(`Message will be deleted after ${deleteTimeout}ms`);
            setTimeout(async () => {
                try {
                    await ctx.api.deleteMessage(ctx.chat.id, response.message_id);
                }
                catch (error) {
                    console.error("Error deleting unauthorized message:", error);
                }
            }, deleteTimeout);
        }
    }
    catch (error) {
        console.error("Error handling unauthorized access:", error);
    }
}
