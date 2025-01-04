import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { RepoHistory } from '../types/config';

export const useRepoHistory = (telegramId?: number) => {
    const { data: history, isLoading, error } = useQuery<RepoHistory[]>({
        queryKey: ['repo_history', telegramId],
        queryFn: async () => {
            let query = supabase
                .from('repo_history')
                .select('*')
                .order('processed_at', { ascending: false });

            if (telegramId) {
                query = query.eq('telegram_user_id', telegramId);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            return data;
        },
        enabled: !telegramId || !!telegramId // Solo ejecutar si no hay telegramId o si hay uno válido
    });

    return {
        history,
        isLoading,
        error
    };
}; 