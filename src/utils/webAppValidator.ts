import crypto from 'crypto';
import { config } from '../config/config';

export interface WebAppInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  auth_date: number;
  hash: string;
}

export class WebAppValidator {
  private static readonly MAX_AUTH_AGE = 86400; // 24 hours in seconds

  /**
   * Validates the initialization data from Telegram WebApp
   * @param initData - Raw initialization data string from WebApp
   * @returns boolean indicating if the data is valid
   */
  static validateInitData(initData: string): boolean {
    try {
      // Parse the URL-encoded string
      const searchParams = new URLSearchParams(initData);
      const hash = searchParams.get('hash');
      if (!hash) return false;

      // Remove hash from the data before checking
      searchParams.delete('hash');

      // Create a check string by sorting alphabetically
      const checkArr: string[] = [];
      searchParams.sort();
      searchParams.forEach((value, key) => {
        checkArr.push(`${key}=${value}`);
      });
      const checkString = checkArr.join('\n');

      // Create a secret key from bot token
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(config.telegramToken)
        .digest();

      // Calculate hash
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(checkString)
        .digest('hex');

      // Verify hash matches
      if (calculatedHash !== hash) return false;

      // Parse and validate auth_date
      const authDate = parseInt(searchParams.get('auth_date') || '0', 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > this.MAX_AUTH_AGE) return false;

      // Validate user data exists
      const userData = searchParams.get('user');
      if (!userData) return false;

      return true;
    } catch (error) {
      console.error('Error validating WebApp data:', error);
      return false;
    }
  }

  /**
   * Parses the initialization data into a structured object
   * @param initData - Raw initialization data string from WebApp
   * @returns Parsed WebApp initialization data or null if invalid
   */
  static parseInitData(initData: string): WebAppInitData | null {
    try {
      const searchParams = new URLSearchParams(initData);
      const userData = searchParams.get('user');
      
      if (!userData) return null;

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
    } catch (error) {
      console.error('Error parsing WebApp data:', error);
      return null;
    }
  }
} 