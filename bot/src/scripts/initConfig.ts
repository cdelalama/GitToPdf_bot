import { DynamicConfig } from '../utils/dynamicConfig';
import fs from 'fs';
import path from 'path';

const defaultConfigs = [
    {
        key: 'TEMP_DIR',
        value: path.join(process.cwd(), 'temp'),
        type: 'string',
        description: 'Directory for temporary files'
    },
    {
        key: 'MAX_FILES',
        value: '1000',
        type: 'number',
        description: 'Maximum number of files to process in a repository'
    },
    {
        key: 'MIN_DISK_SPACE_MB',
        value: '100',
        type: 'number',
        description: 'Minimum required disk space in MB for operations'
    },
    {
        key: 'PDF_RETENTION_HOURS',
        value: '24',
        type: 'number',
        description: 'Number of hours to keep generated PDFs before cleanup'
    },
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
        // Inicializar directorio temporal
        const defaultTempDir = path.join(process.cwd(), 'temp');
        const TEMP_DIR = await DynamicConfig.get('TEMP_DIR', defaultTempDir);

        // Crear estructura de directorios con manejo de errores mejorado
        const dirs = [
            TEMP_DIR,
            path.join(TEMP_DIR, 'pdfs'),
            path.join(TEMP_DIR, 'operations')
        ];

        for (const dir of dirs) {
            try {
                // Crear directorio con permisos específicos
                await fs.promises.mkdir(dir, { 
                    recursive: true, 
                    mode: 0o755  // rwxr-xr-x
                });

                // Verificar permisos con un archivo temporal único
                const testFile = path.join(dir, `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.tmp`);
                await fs.promises.writeFile(testFile, 'test');
                
                // Verificar que podemos leer el archivo
                const content = await fs.promises.readFile(testFile, 'utf8');
                if (content !== 'test') {
                    throw new Error(`File content verification failed in ${dir}`);
                }
                
                // Limpiar archivo de prueba
                await fs.promises.unlink(testFile);
                
                // Verificar permisos del directorio
                const stats = await fs.promises.stat(dir);
                if (process.platform !== 'win32') {
                    const currentUid = process.getuid?.() ?? -1;
                    if (currentUid !== -1 && stats.uid !== currentUid) {
                        throw new Error(`Directory ${dir} is not owned by current user`);
                    }
                }

                console.log(`✅ Directory initialized with proper permissions: ${dir}`);
            } catch (dirError) {
                console.error(`❌ Error initializing directory ${dir}:`, dirError);
                throw dirError;  // Re-lanzar para que se maneje arriba
            }
        }

        // Inicializar configuraciones
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
        process.exit(1);
    }
}

// Ejecutar si este archivo se ejecuta directamente
if (require.main === module) {
    initializeConfigs();
} 