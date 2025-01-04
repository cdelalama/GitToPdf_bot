import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface Log {
    id: number;
    timestamp: string;
    level: 'error' | 'warn' | 'info';
    message: string;
    details?: Record<string, unknown>;
    user_id?: number;
    action?: string;
}

interface UseLogsOptions {
    level?: string;
    limit?: number;
    offset?: number;
}

export const useLogs = (options: UseLogsOptions = {}) => {
    const { level = 'all', limit = 50, offset = 0 } = options;
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery<{ logs: Log[], total: number }>({
        queryKey: ['logs', { level, limit, offset }],
        queryFn: async () => {
            let query = supabase
                .from('bot_logs')
                .select('*', { count: 'exact' });

            // Aplicar filtro por nivel si no es 'all'
            if (level !== 'all') {
                query = query.eq('level', level);
            }

            const { data, error, count } = await query
                .order('timestamp', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return {
                logs: data || [],
                total: count || 0
            };
        },
        staleTime: 1000 * 60, // Considerar datos frescos por 1 minuto
        refetchInterval: 1000 * 60 * 5 // Refrescar cada 5 minutos
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['logs'] });
    };

    return {
        logs: data?.logs || [],
        total: data?.total || 0,
        isLoading,
        error,
        refresh
    };
}; 