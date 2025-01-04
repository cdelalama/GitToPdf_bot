// Tipos para la tabla bot_config
export interface ConfigItem {
    key: string;
    value: string;
    description: string | null;
    type: 'string' | 'number' | 'boolean' | 'json';
    updated_at: string;
    updated_by: number | null;
}

// Tipos para la tabla users_git2pdf_bot
export interface BotUser {
    telegram_id: number;
    telegram_username: string | null;
    first_name: string;
    last_name: string | null;
    status: 'active' | 'banned' | 'pending';
    ban_reason: string | null;
    banned_at: Date | null;
    banned_by: number | null;
    pdfs_generated: number;
    last_pdf_generated_at: Date | null;
    last_interaction_at: Date | null;
    language_code: string | null;
    created_at: Date;
    updated_at: Date;
    is_admin: boolean;
}

// Tipos para la tabla repo_history
export interface RepoHistory {
    id: number;
    telegram_user_id: number;
    repo_url: string;
    processed_at: Date;
    status: 'success' | 'failed';
    error_message?: string;
    pdf_size?: number;
    processing_time?: number;
}

// Tipos auxiliares
export type UserStatus = 'active' | 'banned' | 'pending'; 