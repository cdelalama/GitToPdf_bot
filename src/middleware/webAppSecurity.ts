import { NextFunction } from 'grammy';
import { WebAppSecurity } from '../utils/webAppSecurity';
import { CustomContext } from '../types/context';

export async function webAppSecurityMiddleware(ctx: CustomContext, next: NextFunction) {
    try {
        // Check if the update contains WebApp data
        const webAppData = ctx.message?.web_app_data;
        if (!webAppData) {
            return next();
        }

        // Validate the initialization data
        const isValid = WebAppSecurity.validateInitData(webAppData.data);
        if (!isValid) {
            await ctx.reply('⚠️ Invalid WebApp data received. Please try again.');
            return;
        }

        // Parse the data for use in subsequent handlers
        const parsedData = WebAppSecurity.parseInitData(webAppData.data);
        if (!parsedData) {
            await ctx.reply('⚠️ Could not process WebApp data. Please try again.');
            return;
        }

        // Attach the parsed data to the context for use in handlers
        ctx.webAppData = parsedData;

        return next();
    } catch (error) {
        console.error('Error in WebApp security middleware:', error);
        await ctx.reply('⚠️ An error occurred while processing your request. Please try again.');
    }
} 