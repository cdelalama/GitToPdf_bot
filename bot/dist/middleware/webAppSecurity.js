"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webAppSecurityMiddleware = webAppSecurityMiddleware;
const webAppSecurity_1 = require("../utils/webAppSecurity");
const dynamicConfig_1 = require("../utils/dynamicConfig");
async function webAppSecurityMiddleware(ctx, next) {
    try {
        // Check if the update contains WebApp data
        const webAppData = ctx.message?.web_app_data;
        if (!webAppData) {
            return next();
        }
        // Validate the initialization data
        const isValid = webAppSecurity_1.WebAppSecurity.validateInitData(webAppData.data);
        if (!isValid) {
            const invalidMessage = await dynamicConfig_1.DynamicConfig.get('INVALID_WEBAPP_MESSAGE', '⚠️ Invalid WebApp data received. Please try again.');
            await ctx.reply(invalidMessage);
            return;
        }
        // Parse the data for use in subsequent handlers
        const parsedData = webAppSecurity_1.WebAppSecurity.parseInitData(webAppData.data);
        if (!parsedData) {
            const errorMessage = await dynamicConfig_1.DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
            await ctx.reply(errorMessage);
            return;
        }
        // Attach the parsed data to the context for use in handlers
        ctx.webAppData = parsedData;
        return next();
    }
    catch (error) {
        console.error('Error in WebApp security middleware:', error);
        const errorMessage = await dynamicConfig_1.DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again.');
        await ctx.reply(errorMessage);
    }
}
