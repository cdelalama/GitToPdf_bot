import { DynamicConfig } from '../utils/dynamicConfig';

const defaultConfigs = [
    {
        key: 'MAX_PDF_SIZE_MB',
        value: '10',
        type: 'number',
        description: 'Maximum PDF file size in megabytes'
    },
    {
        key: 'GITHUB_CLONE_TIMEOUT_MS',
        value: '30000',
        type: 'number',
        description: 'Timeout for GitHub repository cloning in milliseconds'
    },
    {
        key: 'MAX_CONCURRENT_PROCESSES',
        value: '3',
        type: 'number',
        description: 'Maximum number of concurrent PDF generation processes'
    },
    {
        key: 'PDF_DEFAULT_FONT_SIZE',
        value: '12',
        type: 'number',
        description: 'Default font size for PDF generation'
    },
    {
        key: 'PDF_LINE_NUMBERS',
        value: 'true',
        type: 'boolean',
        description: 'Whether to include line numbers in generated PDFs'
    },
    {
        key: 'PDF_INCLUDE_COMMIT_INFO',
        value: 'true',
        type: 'boolean',
        description: 'Whether to include commit information in PDFs'
    },
    {
        key: 'EXCLUDED_FILE_TYPES',
        value: '["jpg", "png", "gif", "mp4", "zip", "exe"]',
        type: 'json',
        description: 'File extensions to exclude from PDF generation'
    },
    {
        key: 'MAX_FILE_SIZE_KB',
        value: '1000',
        type: 'number',
        description: 'Maximum size of individual files to include in KB'
    },
    {
        key: 'DELETE_MESSAGE_TIMEOUT_MS',
        value: '5000',
        type: 'number',
        description: 'Timeout for auto-deleting messages in milliseconds'
    },
    {
        key: 'AUTO_APPROVE_USERS',
        value: 'false',
        type: 'boolean',
        description: 'Automatically approve new users'
    },
    {
        key: 'NOTIFY_ADMINS_ON_ERROR',
        value: 'true',
        type: 'boolean',
        description: 'Send notifications to admins on errors'
    },
    {
        key: 'WELCOME_MESSAGE',
        value: 'Welcome to Git2PDF Bot! Send me a GitHub repository URL to generate a PDF.',
        type: 'string',
        description: 'Welcome message for new users'
    },
    {
        key: 'ERROR_MESSAGE',
        value: 'An error occurred. Please try again or contact an admin if the problem persists.',
        type: 'string',
        description: 'Default error message'
    },
    {
        key: 'SUCCESS_MESSAGE',
        value: 'Your PDF has been generated successfully!',
        type: 'string',
        description: 'Success message after PDF generation'
    }
];

async function initializeConfigs() {
    try {
        for (const config of defaultConfigs) {
            await DynamicConfig.set(
                config.key,
                config.value
            );
            console.log(`✅ Initialized ${config.key}`);
        }
        console.log('Configuration initialization completed successfully!');
    } catch (error) {
        console.error('Error initializing configurations:', error);
    }
}

// Ejecutar si este archivo se ejecuta directamente
if (require.main === module) {
    initializeConfigs();
} 