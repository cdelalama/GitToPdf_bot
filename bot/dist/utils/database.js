"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config/config");
exports.supabase = (0, supabase_js_1.createClient)(config_1.config.supabaseUrl, config_1.config.supabaseKey);
class Database {
    static async getUser(telegramId) {
        const { data, error } = await exports.supabase
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
    static async createUser(user) {
        const { data, error } = await exports.supabase
            .from('users_git2pdf_bot')
            .insert([{
                telegram_id: user.telegram_id,
                telegram_username: user.telegram_username,
                first_name: user.first_name,
                last_name: user.last_name,
                language_code: user.language_code,
                status: 'pending',
                pdfs_generated: 0,
                is_admin: false
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
        const { error } = await exports.supabase
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
        const { data: user } = await exports.supabase
            .from('users_git2pdf_bot')
            .select('pdfs_generated')
            .eq('telegram_id', telegramId)
            .single();
        const { error } = await exports.supabase
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
        await exports.supabase
            .from('users_git2pdf_bot')
            .update({ last_interaction_at: new Date() })
            .eq('telegram_id', telegramId);
    }
    static async logRepoProcess(data) {
        try {
            await exports.supabase
                .from('repo_history')
                .insert([data]);
        }
        catch (error) {
            console.error('Error logging repo process:', error);
        }
    }
    static async getUserHistory(telegramId) {
        const { data, error } = await exports.supabase
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
exports.Database = Database;
