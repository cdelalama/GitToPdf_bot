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
        const { data, error } = await supabase
            .from('users_git2pdf_bot')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }

        return data;
    }

    static async createUser(user: {
        telegram_id: number;
        telegram_username?: string;
        first_name: string;
        last_name?: string;
        language_code?: string;
    }): Promise<DatabaseUser | null> {
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
} 