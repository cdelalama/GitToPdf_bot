import * as dotenv from "dotenv";

// Cargar las variables de entorno
dotenv.config();

export const config = {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
    tempDir: "./temp", // Carpeta temporal para los archivos del bot
    githubCloneTimeout: 300000, // Tiempo límite para clonar repos (en ms)

};
