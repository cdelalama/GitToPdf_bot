"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicConfig = exports.config = void 0;
const dotenv = __importStar(require("dotenv"));
const dynamicConfig_1 = require("../utils/dynamicConfig");
const database_1 = require("../utils/database");
const path_1 = __importDefault(require("path"));
// Cargar las variables de entorno
dotenv.config();
// Configuración estática (variables de entorno)
exports.config = {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
    githubToken: process.env.GITHUB_TOKEN,
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    webAppUrl: process.env.WEBAPP_URL || 'https://8894-80-102-3-93.ngrok-free.app',
    webAppToken: process.env.WEBAPP_TOKEN || '', // Token para validar las solicitudes
};
// Configuración dinámica (desde la base de datos)
exports.dynamicConfig = {
    async getTempDir() {
        const defaultTempDir = path_1.default.join(process.cwd(), 'temp');
        return await dynamicConfig_1.DynamicConfig.get('TEMP_DIR', defaultTempDir);
    },
    async getMaxFiles() {
        return await dynamicConfig_1.DynamicConfig.get('MAX_FILES', 1000);
    },
    async getMinDiskSpaceMb() {
        return await dynamicConfig_1.DynamicConfig.get('MIN_DISK_SPACE_MB', 100);
    },
    async getPdfRetentionHours() {
        return await dynamicConfig_1.DynamicConfig.get('PDF_RETENTION_HOURS', 24);
    },
    async getGithubCloneTimeout() {
        return await dynamicConfig_1.DynamicConfig.get('GITHUB_CLONE_TIMEOUT_MS', 300000);
    },
    async getAllowedUsers() {
        const { data, error } = await database_1.Database.supabase
            .from('users_git2pdf_bot')
            .select('telegram_id')
            .eq('status', 'active');
        if (error) {
            console.error('Error getting allowed users:', error);
            return [];
        }
        return data.map((user) => user.telegram_id);
    },
    async getMaxPdfSizeMb() {
        return await dynamicConfig_1.DynamicConfig.get('MAX_PDF_SIZE_MB', 10);
    },
    async getMaxConcurrentProcesses() {
        return await dynamicConfig_1.DynamicConfig.get('MAX_CONCURRENT_PROCESSES', 3);
    },
    async getPdfDefaultFontSize() {
        return await dynamicConfig_1.DynamicConfig.get('PDF_DEFAULT_FONT_SIZE', 12);
    },
    async getPdfLineNumbers() {
        return await dynamicConfig_1.DynamicConfig.get('PDF_LINE_NUMBERS', true);
    },
    async getPdfIncludeCommitInfo() {
        return await dynamicConfig_1.DynamicConfig.get('PDF_INCLUDE_COMMIT_INFO', true);
    },
    async getExcludedFileTypes() {
        return await dynamicConfig_1.DynamicConfig.get('EXCLUDED_FILE_TYPES', ['jpg', 'png', 'gif', 'mp4', 'zip', 'exe']);
    },
    async getMaxFileSizeKb() {
        return await dynamicConfig_1.DynamicConfig.get('MAX_FILE_SIZE_KB', 1000);
    },
    async getDeleteMessageTimeout() {
        return await dynamicConfig_1.DynamicConfig.get('DELETE_MESSAGE_TIMEOUT_MS', 5000);
    },
    async getAutoApproveUsers() {
        return await dynamicConfig_1.DynamicConfig.get('AUTO_APPROVE_USERS', false);
    },
    async getNotifyAdminsOnError() {
        return await dynamicConfig_1.DynamicConfig.get('NOTIFY_ADMINS_ON_ERROR', true);
    },
    async getWelcomeMessage() {
        return await dynamicConfig_1.DynamicConfig.get('WELCOME_MESSAGE', 'Welcome to Git2PDF Bot! Send me a GitHub repository URL to generate a PDF.');
    },
    async getErrorMessage() {
        return await dynamicConfig_1.DynamicConfig.get('ERROR_MESSAGE', 'An error occurred. Please try again or contact an admin if the problem persists.');
    },
    async getSuccessMessage() {
        return await dynamicConfig_1.DynamicConfig.get('SUCCESS_MESSAGE', 'Your PDF has been generated successfully!');
    },
    async getProcessingMessage() {
        return await dynamicConfig_1.DynamicConfig.get('PROCESSING_MESSAGE', '✨ Starting PDF generation. You will receive the file when ready...');
    },
    async getPendingMessage() {
        return await dynamicConfig_1.DynamicConfig.get('PENDING_MESSAGE', '⏳ Your access request is being reviewed. You will be notified when processed.');
    },
    async getApprovalMessage() {
        return await dynamicConfig_1.DynamicConfig.get('APPROVAL_MESSAGE', '✅ Your access request has been approved. You can now use the bot!');
    },
    async getRejectionMessage() {
        return await dynamicConfig_1.DynamicConfig.get('REJECTION_MESSAGE', '❌ Your access request has been denied. Contact the administrator for more information.');
    }
};
