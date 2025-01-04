export interface DatabaseUser {
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

export type UserStatus = 'active' | 'banned' | 'pending'; 