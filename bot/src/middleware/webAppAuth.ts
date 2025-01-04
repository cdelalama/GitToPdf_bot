import { MyContext } from "../types/context";
import { config } from "../config/config";
import crypto from 'crypto';

export function validateWebAppData(initData: string): boolean {
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
        const secret = crypto.createHmac('sha256', 'WebAppData')
            .update(config.telegramToken)
            .digest();

        const calculatedHash = crypto.createHmac('sha256', secret)
            .update(params)
            .digest('hex');

        return calculatedHash === hash;
    } catch (error) {
        console.error('Error validating WebApp data:', error);
        return false;
    }
}

export function webAppAuth(ctx: MyContext, next: () => Promise<void>) {
    if (ctx.message?.web_app_data) {
        const isValid = validateWebAppData(ctx.message.web_app_data.data);
        if (!isValid) {
            console.error('Invalid WebApp data received');
            return;
        }
    }
    return next();
} 