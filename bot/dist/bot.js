"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const config_1 = require("./config/config");
const dynamicConfig_1 = require("./utils/dynamicConfig");
const context_1 = require("./types/context");
const auth_1 = require("./utils/auth");
const commands_1 = require("./handlers/commands");
const messages_1 = require("./handlers/messages");
const callbacks_1 = require("./handlers/callbacks");
const webAppSecurity_1 = require("./middleware/webAppSecurity");
const errors_1 = require("./utils/errors");
async function startBot() {
    try {
        if (!config_1.config.telegramToken) {
            throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
        }
        const bot = new grammy_1.Bot(config_1.config.telegramToken);
        // Inicializar error handler con la instancia del bot
        (0, errors_1.initErrorHandler)(bot);
        // Cargar configuraciones dinámicas
        const welcomeMessage = await dynamicConfig_1.DynamicConfig.get('WELCOME_MESSAGE', 'Welcome to Git2PDF Bot!');
        const errorMessage = await dynamicConfig_1.DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        const deleteTimeout = await dynamicConfig_1.DynamicConfig.get('DELETE_MESSAGE_TIMEOUT_MS', 5000);
        bot.use((0, grammy_1.session)({ initial: () => context_1.initialSession }));
        // Middleware de autorización
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
        // Middleware para validar solicitudes de la TWA
        bot.use(webAppSecurity_1.webAppSecurityMiddleware);
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
        // Error handler
        bot.catch(async (err) => {
            await (0, errors_1.handleError)(err, err.ctx, 'Global Error Handler');
        });
        // Start the bot
        console.log("Starting bot...");
        await bot.start({
            onStart: (botInfo) => {
                console.log(`Bot ${botInfo.username} started successfully!`);
            },
            drop_pending_updates: true
        });
    }
    catch (error) {
        // Notificar error de inicio a los admins
        await (0, errors_1.handleError)(error, undefined, 'Bot Startup');
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}
startBot();
