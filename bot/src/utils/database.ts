import { createClient } from '@supabase/supabase-js';
import { DatabaseUser, UserStatus } from '../types/database';
import * as dotenv from "dotenv";

// Cargar las variables de entorno
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface RepoHistory {
    id: number;
    telegram_user_id: number;
    repo_url: string;
    processed_at: Date;
    status: 'success' | 'failed';
    error_message?: string;
    pdf_size?: number;
    processing_time?: number;
}

interface BotLog {
    id: number;
    timestamp: Date;
    level: 'error' | 'warn' | 'info';
    message: string;
    details?: any;
    user_id?: number;
    action?: string;
}

// Función de utilidad para reintentos
async function withRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3, 
    delay: number = 1000,
    shouldRetry?: (error: any) => boolean
): Promise<T> {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Si hay una función shouldRetry y retorna false, no reintentamos
            if (shouldRetry && !shouldRetry(error)) {
                throw error;
            }
            
            console.warn(`Attempt ${i + 1}/${maxRetries} failed:`, error);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
    throw lastError;
}

export class Database {
    static readonly supabase = supabase;

    static async getAdmins(): Promise<DatabaseUser[]> {
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

    static async getUser(telegramId: number): Promise<DatabaseUser | null> {
        try {
            const { data, error } = await supabase
                .from('users_git2pdf_bot')
                .select('*')
                .eq('telegram_id', telegramId)
                .single();

            // PGRST116 significa que el usuario no existe, es un caso normal
            if (error?.code === 'PGRST116') {
                return null;
            }

            // Si hay otro tipo de error, entonces sí lo logueamos
            if (error) {
                console.error('Error inesperado al buscar usuario:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error crítico en getUser:', error);
            return null;
        }
    }

    static async createUser(user: {
        telegram_id: number;
        telegram_username?: string;
        first_name: string;
        last_name?: string;
        language_code?: string;
    }): Promise<DatabaseUser | null> {
        try {
            const { data, error } = await supabase
                .from('users_git2pdf_bot')
                .insert({
                    telegram_id: user.telegram_id,
                    telegram_username: user.telegram_username,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    language_code: user.language_code,
                    status: 'pending',
                    pdfs_generated: 0,
                    created_at: new Date(),
                    updated_at: new Date()
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating user:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in createUser:', error);
            return null;
        }
    }

    static async updateUserStatus(
        telegramId: number, 
        status: UserStatus, 
        bannedBy?: number, 
        banReason?: string
    ): Promise<boolean> {
        const updateData: Partial<DatabaseUser> = {
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

    static async incrementPdfCount(telegramId: number): Promise<boolean> {
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

    static async updateLastInteraction(telegramId: number): Promise<void> {
        await supabase
            .from('users_git2pdf_bot')
            .update({ last_interaction_at: new Date() })
            .eq('telegram_id', telegramId);
    }

    static async logRepoProcess(data: {
        telegram_user_id: number;
        repo_url: string;
        status: 'success' | 'failed';
        error_message?: string;
        pdf_size?: number;
        processing_time?: number;
    }): Promise<void> {
        try {
            await supabase
                .from('repo_history')
                .insert([data]);
        } catch (error) {
            console.error('Error logging repo process:', error);
        }
    }

    static async getUserHistory(telegramId: number): Promise<RepoHistory[]> {
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

    static async addLog(log: Omit<BotLog, 'id' | 'timestamp'>): Promise<void> {
        try {
            await withRetry(async () => {
                const { error } = await supabase
                    .from('bot_logs')
                    .insert([log]);

                if (error) throw error;
            });
        } catch (error) {
            console.error('Error adding log:', error);
        }
    }

    static async getLogs(options: {
        limit?: number;
        offset?: number;
        level?: BotLog['level'];
        userId?: number;
        startDate?: Date;
        endDate?: Date;
    } = {}): Promise<{ logs: BotLog[]; total: number }> {
        try {
            const {
                limit = 50,
                offset = 0,
                level,
                userId,
                startDate,
                endDate
            } = options;

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

            if (error) throw error;

            return {
                logs: data || [],
                total: count || 0
            };
        } catch (error) {
            console.error('Error fetching logs:', error);
            return { logs: [], total: 0 };
        }
    }

    static async clearOldLogs(daysToKeep: number = 30): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            await withRetry(async () => {
                const { error } = await supabase
                    .from('bot_logs')
                    .delete()
                    .lt('timestamp', cutoffDate.toISOString());

                if (error) throw error;
            });
        } catch (error) {
            console.error('Error clearing old logs:', error);
        }
    }
} 