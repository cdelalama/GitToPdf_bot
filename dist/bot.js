"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const config_1 = require("./config/config");
const context_1 = require("./types/context");
const auth_1 = require("./utils/auth");
const commands_1 = require("./handlers/commands");
const messages_1 = require("./handlers/messages");
const callbacks_1 = require("./handlers/callbacks");
const webAppAuth_1 = require("./middleware/webAppAuth");
if (!config_1.config.telegramToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}
const bot = new grammy_1.Bot(config_1.config.telegramToken);
bot.use((0, grammy_1.session)({ initial: () => context_1.initialSession }));
bot.use(async (ctx, next) => {
    console.log("Authorization middleware triggered");
    if (await (0, auth_1.isUserAuthorized)(ctx)) {
        await next();
    }
    else {
        console.log("User not authorized, handling...");
        await (0, auth_1.handleUnauthorized)(ctx);
    }
});
// Command handlers
bot.command("start", commands_1.handleStart);
bot.command("webapp", commands_1.handleWebApp);
// Message handlers
bot.on("message:text", messages_1.handleTextMessage);
// Callback handlers
bot.callbackQuery(/^generate_pdf:/, callbacks_1.handleGeneratePdf);
bot.callbackQuery(/^cancel:/, callbacks_1.handleCancel);
bot.callbackQuery(/^approve_user:/, callbacks_1.handleApproveUser);
bot.callbackQuery(/^reject_user:/, callbacks_1.handleRejectUser);
// Middleware para validar solicitudes de la TWA
bot.use(webAppAuth_1.webAppAuth);
// Error handler
bot.catch((err) => {
    console.error("Bot error occurred:", err);
});
// Start the bot
console.log("Starting bot...");
bot.start({
    onStart: (botInfo) => {
        console.log("Bot started successfully!");
        console.log("Bot username:", botInfo.username);
    },
    drop_pending_updates: true
});
