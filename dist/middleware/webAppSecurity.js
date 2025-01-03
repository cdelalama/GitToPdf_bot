"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webAppSecurityMiddleware = webAppSecurityMiddleware;
const webAppSecurity_1 = require("../utils/webAppSecurity");
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
            await ctx.reply('⚠️ Invalid WebApp data received. Please try again.');
            return;
        }
        // Parse the data for use in subsequent handlers
        const parsedData = webAppSecurity_1.WebAppSecurity.parseInitData(webAppData.data);
        if (!parsedData) {
            await ctx.reply('⚠️ Could not process WebApp data. Please try again.');
            return;
        }
        // Attach the parsed data to the context for use in handlers
        ctx.webAppData = parsedData;
        return next();
    }
    catch (error) {
        console.error('Error in WebApp security middleware:', error);
        await ctx.reply('⚠️ An error occurred while processing your request. Please try again.');
    }
}
