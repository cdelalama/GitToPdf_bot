-- Inicialización de variables de configuración
INSERT INTO bot_config (key, value, description, type) 
VALUES 
    -- Directorios y timeouts
    ('TEMP_DIR', './temp', 'Directorio temporal para archivos', 'string'),
    ('GITHUB_CLONE_TIMEOUT_MS', '300000', 'Timeout para clonar repositorios (ms)', 'number'),
    ('DELETE_MESSAGE_TIMEOUT_MS', '5000', 'Timeout para borrar mensajes (ms)', 'number'),

    -- Límites y restricciones
    ('MAX_PDF_SIZE_MB', '10', 'Tamaño máximo del PDF en MB', 'number'),
    ('MAX_FILE_SIZE_KB', '1000', 'Tamaño máximo por archivo en KB', 'number'),
    ('MAX_CONCURRENT_PROCESSES', '3', 'Número máximo de procesos concurrentes', 'number'),
    ('EXCLUDED_FILE_TYPES', '["jpg","png","gif","mp4","zip","exe"]', 'Tipos de archivo excluidos', 'json'),

    -- Configuración PDF
    ('PDF_DEFAULT_FONT_SIZE', '12', 'Tamaño de fuente por defecto', 'number'),
    ('PDF_LINE_NUMBERS', 'true', 'Mostrar números de línea', 'boolean'),
    ('PDF_INCLUDE_COMMIT_INFO', 'true', 'Incluir información de commits', 'boolean'),

    -- Control de usuarios
    ('AUTO_APPROVE_USERS', 'false', 'Aprobar usuarios automáticamente', 'boolean'),
    ('NOTIFY_ADMINS_ON_ERROR', 'true', 'Notificar a admins cuando hay errores', 'boolean'),

    -- Mensajes de error y sistema
    ('ERROR_MESSAGE', 'An error occurred. Please try again or contact an admin if the problem persists.', 'Mensaje de error general', 'string'),
    ('INVALID_WEBAPP_MESSAGE', '⚠️ Invalid WebApp data received. Please try again.', 'Mensaje de error para datos inválidos de WebApp', 'string'),
    ('INVALID_URL_MESSAGE', '⚠️ Please send a valid GitHub repository URL.', 'Mensaje de error para URLs inválidas', 'string'),
    ('INVALID_REPO_MESSAGE', '⚠️ This repository is not accessible. Make sure it exists and is public.', 'Mensaje de error para repos inválidos', 'string'),

    -- Mensajes de interacción
    ('WELCOME_MESSAGE', E'Welcome to GitToPDFBot! 📚\n\nI convert GitHub repositories into PDF documents, making it easy to:\n• Read code offline\n• Share code documentation\n• Review repositories\n• Feed code context to LLMs (ChatGPT, Claude, etc.)\n\nJust send me a GitHub repository URL and I''ll generate a PDF with its contents.\n\n🔜 Coming soon: Direct integration with ChatGPT to analyze repositories!\n\nExample: https://github.com/username/repository\n\n🔐 Admin: Use the dashboard to manage users and monitor bot usage.', 'Mensaje de bienvenida', 'string'),
    ('SUCCESS_MESSAGE', 'Your PDF has been generated successfully!', 'Mensaje de éxito', 'string'),
    ('ACTION_PROMPT_MESSAGE', 'What would you like to do with this repository?', 'Mensaje de prompt para acciones', 'string'),
    
    -- Mensajes de aprobación/rechazo
    ('APPROVAL_MESSAGE', '✅ Your access request has been approved! You can now use the bot.', 'Mensaje cuando se aprueba un usuario', 'string'),
    ('REJECTION_MESSAGE', '❌ Your access request has been denied. Contact the administrator for more information.', 'Mensaje cuando se rechaza un usuario', 'string'),
    ('PENDING_MESSAGE', '⏳ Your access request is being reviewed. You will be notified when processed.', 'Mensaje cuando el usuario está pendiente', 'string')

ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    type = EXCLUDED.type; 