import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config';
import { DatabaseUser, UserStatus } from '../types/database';

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

export class Database {
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
        const { error } = await supabase
            .from('users_git2pdf_bot')
            .update({ 
                pdfs_generated: supabase.rpc('increment', { value: 1 }),
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
} 