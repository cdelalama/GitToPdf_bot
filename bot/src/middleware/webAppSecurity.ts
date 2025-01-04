import { NextFunction } from 'grammy';
import { WebAppSecurity } from '../utils/webAppSecurity';
import { CustomContext } from '../types/context';
import { DynamicConfig } from '../utils/dynamicConfig';

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
            const invalidMessage = await DynamicConfig.get('INVALID_WEBAPP_MESSAGE', '⚠️ Invalid WebApp data received. Please try again.');
            await ctx.reply(invalidMessage);
            return;
        }

        // Parse the data for use in subsequent handlers
        const parsedData = WebAppSecurity.parseInitData(webAppData.data);
        if (!parsedData) {
            const errorMessage = await DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
            await ctx.reply(errorMessage);
            return;
        }

        // Attach the parsed data to the context for use in handlers
        ctx.webAppData = parsedData;

        return next();
    } catch (error) {
        console.error('Error in WebApp security middleware:', error);
        const errorMessage = await DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        await ctx.reply(errorMessage);
    }
} 