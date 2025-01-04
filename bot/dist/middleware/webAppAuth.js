"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWebAppData = validateWebAppData;
exports.webAppAuth = webAppAuth;
const config_1 = require("../config/config");
const crypto_1 = __importDefault(require("crypto"));
function validateWebAppData(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        // Ordenar los parámetros
        const params = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        // Calcular el HMAC
        const secret = crypto_1.default.createHmac('sha256', 'WebAppData')
            .update(config_1.config.telegramToken)
            .digest();
        const calculatedHash = crypto_1.default.createHmac('sha256', secret)
            .update(params)
            .digest('hex');
        return calculatedHash === hash;
    }
    catch (error) {
        console.error('Error validating WebApp data:', error);
        return false;
    }
}
function webAppAuth(ctx, next) {
    if (ctx.message?.web_app_data) {
        const isValid = validateWebAppData(ctx.message.web_app_data.data);
        if (!isValid) {
            console.error('Invalid WebApp data received');
            return;
        }
    }
    return next();
}
