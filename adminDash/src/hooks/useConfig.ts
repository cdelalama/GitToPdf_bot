import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

interface ConfigItem {
    key: string;
    value: string;
    description: string | null;
    type: 'string' | 'number' | 'boolean' | 'json';
    updated_at: string;
    updated_by: number | null;
}

export const useConfig = () => {
    const queryClient = useQueryClient();

    const { data: configs, isLoading, error } = useQuery<ConfigItem[]>({
        queryKey: ['configs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bot_config')
                .select('*')
                .order('key');
            
            if (error) throw error;
            return data;
        }
    });

    const updateConfig = useMutation({
        mutationFn: async ({ key, value, type, description }: Partial<ConfigItem> & { key: string }) => {
            const { error } = await supabase
                .from('bot_config')
                .upsert({
                    key,
                    value: type === 'json' ? JSON.stringify(value) : String(value),
                    type,
                    description,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configs'] });
        }
    });

    const deleteConfig = useMutation({
        mutationFn: async (key: string) => {
            const { error } = await supabase
                .from('bot_config')
                .delete()
                .eq('key', key);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configs'] });
        }
    });

    return {
        configs,
        isLoading,
        error,
        updateConfig,
        deleteConfig
    };
}; 