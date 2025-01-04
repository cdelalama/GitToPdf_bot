import * as dotenv from "dotenv";
import { DynamicConfig } from "../utils/dynamicConfig";
import { Database } from "../utils/database";
import path from "path";

// Cargar las variables de entorno
dotenv.config();

// Configuración estática (variables de entorno)
export const config = {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
    githubToken: process.env.GITHUB_TOKEN,
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    webAppUrl: process.env.WEBAPP_URL || 'https://8894-80-102-3-93.ngrok-free.app',
    webAppToken: process.env.WEBAPP_TOKEN || '', // Token para validar las solicitudes
};

// Configuración dinámica (desde la base de datos)
export const dynamicConfig = {
    async getTempDir(): Promise<string> {
        const defaultTempDir = path.join(process.cwd(), 'temp');
        return await DynamicConfig.get('TEMP_DIR', defaultTempDir);
    },

    async getMaxFiles(): Promise<number> {
        return await DynamicConfig.get('MAX_FILES', 1000);
    },

    async getMinDiskSpaceMb(): Promise<number> {
        return await DynamicConfig.get('MIN_DISK_SPACE_MB', 100);
    },

    async getPdfRetentionHours(): Promise<number> {
        return await DynamicConfig.get('PDF_RETENTION_HOURS', 24);
    },

    async getGithubCloneTimeout(): Promise<number> {
        return await DynamicConfig.get('GITHUB_CLONE_TIMEOUT_MS', 300000);
    },

    async getAllowedUsers(): Promise<number[]> {
        const { data, error } = await Database.supabase
            .from('users_git2pdf_bot')
            .select('telegram_id')
            .eq('status', 'active');
        
        if (error) {
            console.error('Error getting allowed users:', error);
            return [];
        }

        return data.map((user: { telegram_id: number }) => user.telegram_id);
    },

    async getMaxPdfSizeMb(): Promise<number> {
        return await DynamicConfig.get('MAX_PDF_SIZE_MB', 10);
    },

    async getMaxConcurrentProcesses(): Promise<number> {
        return await DynamicConfig.get('MAX_CONCURRENT_PROCESSES', 3);
    },

    async getPdfDefaultFontSize(): Promise<number> {
        return await DynamicConfig.get('PDF_DEFAULT_FONT_SIZE', 12);
    },

    async getPdfLineNumbers(): Promise<boolean> {
        return await DynamicConfig.get('PDF_LINE_NUMBERS', true);
    },

    async getPdfIncludeCommitInfo(): Promise<boolean> {
        return await DynamicConfig.get('PDF_INCLUDE_COMMIT_INFO', true);
    },

    async getExcludedFileTypes(): Promise<string[]> {
        return await DynamicConfig.get('EXCLUDED_FILE_TYPES', ['jpg', 'png', 'gif', 'mp4', 'zip', 'exe']);
    },

    async getMaxFileSizeKb(): Promise<number> {
        return await DynamicConfig.get('MAX_FILE_SIZE_KB', 1000);
    },

    async getDeleteMessageTimeout(): Promise<number> {
        return await DynamicConfig.get('DELETE_MESSAGE_TIMEOUT_MS', 5000);
    },

    async getAutoApproveUsers(): Promise<boolean> {
        return await DynamicConfig.get('AUTO_APPROVE_USERS', false);
    },

    async getNotifyAdminsOnError(): Promise<boolean> {
        return await DynamicConfig.get('NOTIFY_ADMINS_ON_ERROR', true);
    },

    async getWelcomeMessage(): Promise<string> {
        return await DynamicConfig.get('WELCOME_MESSAGE', 'Welcome to Git2PDF Bot! Send me a GitHub repository URL to generate a PDF.');
    },

    async getErrorMessage(): Promise<string> {
        return await DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again or contact an admin if the problem persists.');
    },

    async getSuccessMessage(): Promise<string> {
        return await DynamicConfig.get('SUCCESS_MESSAGE', 'Your PDF has been generated successfully!');
    },

    async getProcessingMessage(): Promise<string> {
        return await DynamicConfig.get('PROCESSING_MESSAGE', '✨ Starting PDF generation. You will receive the file when ready...');
    },

    async getPendingMessage(): Promise<string> {
        return await DynamicConfig.get('PENDING_MESSAGE', '⏳ Your access request is being reviewed. You will be notified when processed.');
    },

    async getApprovalMessage(): Promise<string> {
        return await DynamicConfig.get('APPROVAL_MESSAGE', '✅ Your access request has been approved. You can now use the bot!');
    },

    async getRejectionMessage(): Promise<string> {
        return await DynamicConfig.get('REJECTION_MESSAGE', '❌ Your access request has been denied. Contact the administrator for more information.');
    }
};
