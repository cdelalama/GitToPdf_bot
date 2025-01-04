import { Bot, session } from "grammy";
import { config } from "./config/config";
import { DynamicConfig } from "./utils/dynamicConfig";
import { MyContext, initialSession } from "./types/context";
import { isUserAuthorized, handleUnauthorized } from "./utils/auth";
import { handleStart, handleWebApp } from "./handlers/commands";
import { handleTextMessage } from "./handlers/messages";
import { handleGeneratePdf, handleCancel, handleApproveUser, handleRejectUser } from "./handlers/callbacks";
import { webAppSecurityMiddleware } from "./middleware/webAppSecurity";
import { handleError, initErrorHandler } from "./utils/errors";

async function startBot() {
    try {
        if (!config.telegramToken) {
            throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
        }

        const bot = new Bot<MyContext>(config.telegramToken);

        // Inicializar error handler con la instancia del bot
        initErrorHandler(bot);

        // Cargar configuraciones dinámicas
        const welcomeMessage = await DynamicConfig.get('WELCOME_MESSAGE', 'Welcome to Git2PDF Bot!');
        const errorMessage = await DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        const deleteTimeout = await DynamicConfig.get('DELETE_MESSAGE_TIMEOUT_MS', 5000);

        bot.use(session({ initial: () => initialSession }));

        // Middleware de autorización
        bot.use(async (ctx, next) => {
            console.log("Authorization middleware triggered");
            if (await isUserAuthorized(ctx)) {
                await next();
            } else {
                console.log("User not authorized, handling...");
                await handleUnauthorized(ctx);
            }
        });

        // Middleware para validar solicitudes de la TWA
        bot.use(webAppSecurityMiddleware);

        // Command handlers
        bot.command("start", handleStart);
        bot.command("webapp", handleWebApp);

        // Message handlers
        bot.on("message:text", handleTextMessage);

        // Callback handlers
        bot.callbackQuery(/^generate_pdf:/, handleGeneratePdf);
        bot.callbackQuery(/^cancel:/, handleCancel);
        bot.callbackQuery(/^approve_user:/, handleApproveUser);
        bot.callbackQuery(/^reject_user:/, handleRejectUser);

        // Error handler
        bot.catch(async (err) => {
            await handleError(err, err.ctx, 'Global Error Handler');
        });

        // Start the bot
        console.log("Starting bot...");
        await bot.start({
            onStart: (botInfo) => {
                console.log(`Bot ${botInfo.username} started successfully!`);
            },
            drop_pending_updates: true
        });

    } catch (error) {
        // Notificar error de inicio a los admins
        await handleError(error, undefined, 'Bot Startup');
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

startBot();