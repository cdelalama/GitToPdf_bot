import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { BotUser, UserStatus } from '../types/config';

export const useUsers = () => {
    const queryClient = useQueryClient();

    const { data: users, isLoading, error } = useQuery<BotUser[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users_git2pdf_bot')
                .select('*')
                .order('last_interaction_at', { ascending: false });
            
            if (error) throw error;
            return data;
        }
    });

    const updateUserStatus = useMutation({
        mutationFn: async ({ telegramId, status, banReason }: { telegramId: number; status: UserStatus; banReason?: string }) => {
            const updateData: Partial<BotUser> = {
                status,
                updated_at: new Date(),
            };

            if (status === 'banned') {
                updateData.banned_at = new Date();
                updateData.ban_reason = banReason || null;
            }

            const { error } = await supabase
                .from('users_git2pdf_bot')
                .update(updateData)
                .eq('telegram_id', telegramId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
    });

    const toggleAdmin = useMutation({
        mutationFn: async ({ telegramId, isAdmin }: { telegramId: number; isAdmin: boolean }) => {
            const { error } = await supabase
                .from('users_git2pdf_bot')
                .update({ is_admin: isAdmin })
                .eq('telegram_id', telegramId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
    });

    return {
        users,
        isLoading,
        error,
        updateUserStatus,
        toggleAdmin
    };
}; 