import { MyContext } from "../types/context";
import { DynamicConfig } from "./dynamicConfig";
import { Database } from "./database";
import { Bot } from "grammy";
import { config } from "../config/config";

// Bot instance para notificaciones sin contexto
let botInstance: Bot<MyContext> | null = null;

export function initErrorHandler(bot: Bot<MyContext>) {
    botInstance = bot;
}

export async function handleError(error: any, ctx?: MyContext, details: string = '') {
    console.error(`Error occurred ${details ? `in ${details}` : ''}:`, error);

    try {
        const notifyAdmins = await DynamicConfig.get('NOTIFY_ADMINS_ON_ERROR', true);
        if (notifyAdmins) {
            const admins = await Database.getAdmins();
            
            // Extraer mensaje de error de forma segura
            const errorMessage = error instanceof Error ? 
                error.message : 
                typeof error === 'string' ? 
                    error : 
                    'Unknown error';

            const errorDetails = `🚨 Error Report\n\nError: ${errorMessage}\n${details ? `\nLocation: ${details}` : ''}`;
            const userInfo = ctx?.from ? 
                `\nUser: ${ctx.from.first_name} (ID: ${ctx.from.id})` : 
                '\nNo user info available';
            const commandInfo = ctx?.message?.text ? 
                `\nCommand: ${ctx.message.text}` : 
                ctx?.callbackQuery?.data ?
                `\nCallback: ${ctx.callbackQuery.data}` :
                '\nNo command info available';
            
            const timestamp = new Date().toISOString();
            const fullError = `${errorDetails}${userInfo}${commandInfo}\n\nTimestamp: ${timestamp}`;
            
            // Notificar a cada admin usando el bot instance o el contexto
            let tempBot: Bot<MyContext> | null = null;
            try {
                for (const admin of admins) {
                    try {
                        if (ctx?.api) {
                            await ctx.api.sendMessage(admin.telegram_id, fullError);
                        } else if (botInstance) {
                            await botInstance.api.sendMessage(admin.telegram_id, fullError);
                        } else {
                            // Crear bot temporal solo si es necesario
                            if (!tempBot) {
                                tempBot = new Bot<MyContext>(config.telegramToken);
                            }
                            await tempBot.api.sendMessage(admin.telegram_id, fullError);
                        }
                    } catch (notifyError) {
                        console.error(`Failed to notify admin ${admin.telegram_id}:`, notifyError);
                    }
                }
            } finally {
                // Limpiar bot temporal si se creó
                if (tempBot) {
                    try {
                        await tempBot.stop();
                    } catch (stopError) {
                        console.error('Error stopping temporary bot:', stopError);
                    }
                }
            }
        }

        // Responder al usuario si hay contexto
        if (ctx) {
            const errorMessage = await DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
            if (ctx.callbackQuery) {
                await ctx.reply(errorMessage);
            } else {
                await ctx.reply(errorMessage, {
                    reply_to_message_id: ctx.msg?.message_id
                });
            }
        }
    } catch (handlingError) {
        console.error('Error while handling error:', handlingError);
    }
} 