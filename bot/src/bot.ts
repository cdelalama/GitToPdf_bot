import { Bot, session } from "grammy";
import { config } from "./config/config";
import { MyContext, initialSession } from "./types/context";
import { isUserAuthorized, handleUnauthorized } from "./utils/auth";
import { handleStart, handleWebApp } from "./handlers/commands";
import { handleTextMessage } from "./handlers/messages";
import { handleGeneratePdf, handleCancel, handleApproveUser, handleRejectUser } from "./handlers/callbacks";
import { webAppAuth } from "./middleware/webAppAuth";

if (!config.telegramToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}

const bot = new Bot<MyContext>(config.telegramToken);

bot.use(session({ initial: () => initialSession }));

bot.use(async (ctx, next) => {
    console.log("Authorization middleware triggered");
    if (await isUserAuthorized(ctx)) {
        await next();
    } else {
        console.log("User not authorized, handling...");
        await handleUnauthorized(ctx);
    }
});

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

// Middleware para validar solicitudes de la TWA
bot.use(webAppAuth);

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