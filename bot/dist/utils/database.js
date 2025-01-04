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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
// Cargar las variables de entorno
dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// Función de utilidad para reintentos
async function withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1}/${maxRetries} failed:`, error);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
    throw lastError;
}
class Database {
    static async getAdmins() {
        const { data, error } = await supabase
            .from('users_git2pdf_bot')
            .select('*')
            .eq('is_admin', true);
        if (error) {
            console.error('Error fetching admins:', error);
            return [];
        }
        return data || [];
    }
    static async getUser(telegramId) {
        try {
            const result = await withRetry(async () => {
                const { data, error } = await supabase
                    .from('users_git2pdf_bot')
                    .select('*')
                    .eq('telegram_id', telegramId)
                    .single();
                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }
                return data;
            });
            return result;
        }
        catch (error) {
            console.error('Error fetching user:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                details: error
            });
            return null;
        }
    }
    static async createUser(user) {
        const { data, error } = await supabase
            .from('users_git2pdf_bot')
            .insert([{
                telegram_id: user.telegram_id,
                telegram_username: user.telegram_username,
                first_name: user.first_name,
                last_name: user.last_name,
                language_code: user.language_code,
                status: 'pending',
                pdfs_generated: 0
            }])
            .select()
            .single();
        if (error) {
            console.error('Error creating user:', error);
            return null;
        }
        return data;
    }
    static async updateUserStatus(telegramId, status, bannedBy, banReason) {
        const updateData = {
            status,
            updated_at: new Date()
        };
        if (status === 'banned') {
            updateData.banned_at = new Date();
            updateData.banned_by = bannedBy;
            updateData.ban_reason = banReason;
        }
        const { error } = await supabase
            .from('users_git2pdf_bot')
            .update(updateData)
            .eq('telegram_id', telegramId);
        if (error) {
            console.error('Error updating user status:', error);
            return false;
        }
        return true;
    }
    static async incrementPdfCount(telegramId) {
        const { data: user } = await supabase
            .from('users_git2pdf_bot')
            .select('pdfs_generated')
            .eq('telegram_id', telegramId)
            .single();
        const { error } = await supabase
            .from('users_git2pdf_bot')
            .update({
            pdfs_generated: (user?.pdfs_generated || 0) + 1,
            last_pdf_generated_at: new Date()
        })
            .eq('telegram_id', telegramId);
        if (error) {
            console.error('Error incrementing PDF count:', error);
            return false;
        }
        return true;
    }
    static async updateLastInteraction(telegramId) {
        await supabase
            .from('users_git2pdf_bot')
            .update({ last_interaction_at: new Date() })
            .eq('telegram_id', telegramId);
    }
    static async logRepoProcess(data) {
        try {
            await supabase
                .from('repo_history')
                .insert([data]);
        }
        catch (error) {
            console.error('Error logging repo process:', error);
        }
    }
    static async getUserHistory(telegramId) {
        const { data, error } = await supabase
            .from('repo_history')
            .select('*')
            .eq('telegram_user_id', telegramId)
            .order('processed_at', { ascending: false });
        if (error) {
            console.error('Error fetching user history:', error);
            return [];
        }
        return data || [];
    }
    static async addLog(log) {
        try {
            await withRetry(async () => {
                const { error } = await supabase
                    .from('bot_logs')
                    .insert([log]);
                if (error)
                    throw error;
            });
        }
        catch (error) {
            console.error('Error adding log:', error);
        }
    }
    static async getLogs(options = {}) {
        try {
            const { limit = 50, offset = 0, level, userId, startDate, endDate } = options;
            let query = supabase
                .from('bot_logs')
                .select('*', { count: 'exact' });
            if (level) {
                query = query.eq('level', level);
            }
            if (userId) {
                query = query.eq('user_id', userId);
            }
            if (startDate) {
                query = query.gte('timestamp', startDate.toISOString());
            }
            if (endDate) {
                query = query.lte('timestamp', endDate.toISOString());
            }
            const { data, error, count } = await query
                .order('timestamp', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error)
                throw error;
            return {
                logs: data || [],
                total: count || 0
            };
        }
        catch (error) {
            console.error('Error fetching logs:', error);
            return { logs: [], total: 0 };
        }
    }
    static async clearOldLogs(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            await withRetry(async () => {
                const { error } = await supabase
                    .from('bot_logs')
                    .delete()
                    .lt('timestamp', cutoffDate.toISOString());
                if (error)
                    throw error;
            });
        }
        catch (error) {
            console.error('Error clearing old logs:', error);
        }
    }
}
exports.Database = Database;
Database.supabase = supabase;
