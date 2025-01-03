"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN must be provided in environment variables');
}
exports.config = {
    BOT_TOKEN: process.env.BOT_TOKEN,
};
