import * as dotenv from "dotenv";

// Cargar las variables de entorno
dotenv.config();

export const config = {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
    tempDir: "./temp", // Carpeta temporal para los archivos del bot
    githubCloneTimeout: 300000, // Tiempo límite para clonar repos (en ms)
    // Lista de usuarios permitidos (usernames o IDs)
    allowedUsers: (process.env.ALLOWED_USERS || "")
        .split(",")
        .map(user => user.trim())
        .filter(user => user.length > 0),
    githubToken: process.env.GITHUB_TOKEN,
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    webAppUrl: process.env.WEBAPP_URL || 'https://8894-80-102-3-93.ngrok-free.app',
    webAppToken: process.env.WEBAPP_TOKEN || '', // Token para validar las solicitudes
};
