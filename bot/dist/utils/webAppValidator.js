"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAppValidator = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config/config");
class WebAppValidator {
    /**
     * Validates the initialization data from Telegram WebApp
     * @param initData - Raw initialization data string from WebApp
     * @returns boolean indicating if the data is valid
     */
    static validateInitData(initData) {
        try {
            // Parse the URL-encoded string
            const searchParams = new URLSearchParams(initData);
            const hash = searchParams.get('hash');
            if (!hash)
                return false;
            // Remove hash from the data before checking
            searchParams.delete('hash');
            // Create a check string by sorting alphabetically
            const checkArr = [];
            searchParams.sort();
            searchParams.forEach((value, key) => {
                checkArr.push(`${key}=${value}`);
            });
            const checkString = checkArr.join('\n');
            // Create a secret key from bot token
            const secretKey = crypto_1.default
                .createHmac('sha256', 'WebAppData')
                .update(config_1.config.telegramToken)
                .digest();
            // Calculate hash
            const calculatedHash = crypto_1.default
                .createHmac('sha256', secretKey)
                .update(checkString)
                .digest('hex');
            // Verify hash matches
            if (calculatedHash !== hash)
                return false;
            // Parse and validate auth_date
            const authDate = parseInt(searchParams.get('auth_date') || '0', 10);
            const now = Math.floor(Date.now() / 1000);
            if (now - authDate > this.MAX_AUTH_AGE)
                return false;
            // Validate user data exists
            const userData = searchParams.get('user');
            if (!userData)
                return false;
            return true;
        }
        catch (error) {
            console.error('Error validating WebApp data:', error);
            return false;
        }
    }
    /**
     * Parses the initialization data into a structured object
     * @param initData - Raw initialization data string from WebApp
     * @returns Parsed WebApp initialization data or null if invalid
     */
    static parseInitData(initData) {
        try {
            const searchParams = new URLSearchParams(initData);
            const userData = searchParams.get('user');
            if (!userData)
                return null;
            const user = JSON.parse(userData);
            const authDate = parseInt(searchParams.get('auth_date') || '0', 10);
            const hash = searchParams.get('hash') || '';
            const queryId = searchParams.get('query_id');
            return {
                query_id: queryId || undefined,
                user,
                auth_date: authDate,
                hash
            };
        }
        catch (error) {
            console.error('Error parsing WebApp data:', error);
            return null;
        }
    }
}
exports.WebAppValidator = WebAppValidator;
WebAppValidator.MAX_AUTH_AGE = 86400; // 24 hours in seconds
