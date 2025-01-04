"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserAuthorized = isUserAuthorized;
exports.handleUnauthorized = handleUnauthorized;
const database_1 = require("./database");
const config_1 = require("../config/config");
// Cache para controlar el tiempo entre mensajes pendientes
const pendingMessageCooldown = new Map();
const COOLDOWN_MS = 60000; // 1 minuto
// Función unificada para manejar mensajes de estado pendiente
async function handlePendingMessage(ctx, isNewUser = false) {
    const userId = ctx.from?.id;
    if (!userId)
        return;
    // Verificar cooldown para usuarios existentes
    if (!isNewUser) {
        const lastMessageTime = pendingMessageCooldown.get(userId);
        const now = Date.now();
        if (lastMessageTime && now - lastMessageTime < COOLDOWN_MS) {
            return; // No enviar mensaje si está en cooldown
        }
        pendingMessageCooldown.set(userId, now);
    }
    const pendingMessage = await config_1.dynamicConfig.getPendingMessage();
    if (isNewUser) {
        const welcomeMessage = await config_1.dynamicConfig.getWelcomeMessage();
        await ctx.reply(`👋 Hello${ctx.from?.username ? ` @${ctx.from.username}` : ''}!\n\n` +
            welcomeMessage + '\n\n' +
            `🔒 For security reasons, access is restricted.\n\n` +
            pendingMessage);
    }
    else {
        await ctx.reply(`🔒 Access Restricted\n\n${pendingMessage}`);
    }
}
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
    // Si el usuario no existe o está pendiente, manejar con handleUnauthorized
    if (!user || user.status === 'pending') {
        await handleUnauthorized(ctx);
        return false;
    }
    // Actualizar última interacción
    await database_1.Database.updateLastInteraction(userId);
    // Si es admin o está activo, permitir acceso
    return user.is_admin || user.status === 'active';
}
async function handleUnauthorized(ctx) {
    try {
        const telegramId = ctx.from?.id;
        if (!telegramId) {
            console.error('No telegram ID found in context');
            return;
        }
        // Verificar si el usuario ya existe
        const existingUser = await database_1.Database.getUser(telegramId);
        if (existingUser) {
            // Si el usuario ya existe y está pendiente, informarle
            if (existingUser.status === 'pending') {
                await handlePendingMessage(ctx);
            }
            return;
        }
        // Si el usuario no existe, crearlo como pendiente
        const newUser = {
            telegram_id: telegramId,
            username: ctx.from?.username || null,
            first_name: ctx.from?.first_name || null,
            last_name: ctx.from?.last_name || null,
            language_code: ctx.from?.language_code || null,
            status: 'pending',
            is_admin: false
        };
        const { error: insertError } = await database_1.Database.supabase
            .from('users_git2pdf_bot')
            .insert([newUser]);
        if (insertError) {
            console.error('Error creating user:', insertError);
            return;
        }
        // Verificar si debemos auto-aprobar al usuario
        const autoApprove = await config_1.dynamicConfig.getAutoApproveUsers();
        if (autoApprove) {
            // Actualizar estado a activo
            const { error: updateError } = await database_1.Database.supabase
                .from('users_git2pdf_bot')
                .update({ status: 'active' })
                .eq('telegram_id', telegramId);
            if (updateError) {
                console.error('Error auto-approving user:', updateError);
                return;
            }
            // Enviar mensaje de aprobación
            const approvalMessage = await config_1.dynamicConfig.getApprovalMessage();
            await ctx.reply(approvalMessage);
            return;
        }
        // Si no hay auto-aprobación, notificar que está pendiente
        await handlePendingMessage(ctx, true);
        // Notificar a los admins sobre el nuevo usuario
        const admins = await database_1.Database.getAdmins();
        const userInfo = `New user request:\nID: ${telegramId}\nUsername: @${ctx.from?.username || 'N/A'}\nName: ${ctx.from?.first_name || 'N/A'} ${ctx.from?.last_name || ''}`;
        for (const admin of admins) {
            try {
                await ctx.api.sendMessage(admin.telegram_id, userInfo, {
                    reply_markup: {
                        inline_keyboard: [[
                                { text: '✅ Approve', callback_data: `approve_user:${telegramId}` },
                                { text: '❌ Reject', callback_data: `reject_user:${telegramId}` }
                            ]]
                    }
                });
            }
            catch (error) {
                console.error(`Failed to notify admin ${admin.telegram_id}:`, error);
            }
        }
    }
    catch (error) {
        console.error('Error in handleUnauthorized:', error);
    }
}
