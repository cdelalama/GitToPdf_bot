import { Bot } from "grammy";
import * as dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();
// Use the bot token from the .env file
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
bot.command("start", (ctx) => ctx.reply("Welcome to my basic GrammY bot!"));
bot.on("message", (ctx) => {
  ctx.reply(`You said: ${ctx.message.text}`);
});
bot.start();