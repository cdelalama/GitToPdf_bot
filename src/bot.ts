import { Bot, InputFile, InlineKeyboard } from "grammy";
import * as dotenv from "dotenv";
import { githubToPdf } from "./modules/githubToPdf";
import { config } from "./config/config";
import * as fs from "fs";
import path from "path";

// Check if bot token exists
if (!config.telegramToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}

// Initialize bot with token
const bot = new Bot(config.telegramToken);

// Command handlers
bot.command("start", async (ctx) => {
    try {
        console.log("Received start command from:", ctx.from?.username);
        await ctx.reply(
            "Welcome to GitToPDFBot! 👋\n\n" +
            "Just send me a GitHub repository URL and I'll generate a PDF with its contents.\n\n" +
            "Example: https://github.com/username/repository"
        );
    } catch (error) {
        console.error("Error in start command:", error);
    }
});

// Función para validar URL de GitHub
async function isValidGithubRepo(url: string): Promise<boolean> {
    try {
        const apiUrl = url
            .replace(/\.git$/, '')  // Remover .git si existe
            .replace('github.com', 'api.github.com/repos');
            
        console.log("Checking repository at:", apiUrl);
        const response = await fetch(apiUrl);
        const isValid = response.status === 200;
        console.log("Repository validation result:", isValid);
        return isValid;
    } catch (error) {
        console.error("Error validating repository:", error);
        return false;
    }
}

// Función para extraer URLs de GitHub del texto
function extractGithubUrl(text: string): string | null {
    // Remover @ si existe al principio
    text = text.replace(/^@/, '');
    
    // Regex mejorada para URLs de GitHub
    const githubRegex = /https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/;
    const matches = text.match(githubRegex);
    
    if (matches) {
        let url = matches[0];
        // Asegurarnos de que la URL es correcta
        url = url.replace(/\.git$/, ''); // Primero removemos .git si existe
        url = url + '.git'; // Luego lo añadimos de forma consistente
        console.log("Extracted GitHub URL:", url);
        return url;
    }
    return null;
}

// Message handlers
bot.on("message:text", async (ctx) => {
    try {
        let text = ctx.message.text.trim();
        const githubUrl = extractGithubUrl(text);
        
        if (githubUrl) {
            console.log("Detected GitHub URL:", githubUrl);
            
            if (await isValidGithubRepo(githubUrl)) {
                const keyboard = new InlineKeyboard()
                    .text("Generate PDF", `generate_pdf:${githubUrl}`)
                    .text("Cancel", `cancel:${githubUrl}`);
                
                await ctx.reply("I detected a GitHub repository. Would you like to generate a PDF?", {
                    reply_to_message_id: ctx.message.message_id,
                    reply_markup: keyboard
                });
            } else {
                await ctx.reply("This GitHub repository doesn't seem to be accessible. Please check the URL and try again.");
            }
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
});

// Manejar callbacks de los botones
bot.callbackQuery(/^generate_pdf:/, async (ctx) => {
    let pdfPath: string | null = null;
    try {
        const githubUrl = ctx.callbackQuery.data.replace('generate_pdf:', '');
        console.log("Processing URL in callback:", githubUrl);
        
        await ctx.answerCallbackQuery();
        await ctx.reply("Cloning repository and generating PDF. Please wait...");
        
        if (!githubUrl.startsWith('https://github.com')) {
            throw new Error("Invalid GitHub URL");
        }
        
        pdfPath = await githubToPdf(githubUrl);
        console.log("PDF generated successfully at:", pdfPath);
        
        if (!fs.existsSync(pdfPath)) {
            throw new Error("Generated PDF file not found");
        }

        const fileStream = fs.createReadStream(pdfPath);
        await ctx.replyWithDocument(new InputFile(fileStream, path.basename(pdfPath)));
        fileStream.close();
        
    } catch (error: any) {
        console.error("Error generating PDF:", error);
        await ctx.reply(`Error: ${error.message || "Unknown error occurred"}. Please try again.`);
    } finally {
        // Limpiar el archivo PDF si existe
        if (pdfPath && fs.existsSync(pdfPath)) {
            try {
                fs.unlinkSync(pdfPath);
                console.log("Temporary PDF file deleted:", pdfPath);
            } catch (error) {
                console.error("Error deleting PDF file:", error);
            }
        }
    }
});

bot.callbackQuery(/^cancel:/, async (ctx) => {
    await ctx.answerCallbackQuery("Operation cancelled");
    await ctx.reply("Operation cancelled.");
});

// Error handler
bot.catch((err) => {
    console.error("Bot error occurred:", err);
});

// Start the bot
console.log("Starting bot...");
bot.start({
    onStart: (botInfo) => {
        console.log("Bot started successfully!");
        console.log("Bot username:", botInfo.username);
    },
    drop_pending_updates: true // Avoid processing old messages on bot start
});