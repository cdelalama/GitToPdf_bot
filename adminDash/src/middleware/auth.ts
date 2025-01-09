import { supabase } from '@/lib/supabaseClient';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export async function authorizeUser(initData: string): Promise<boolean> {
    try {
        console.log('Starting authorization process...');
        const searchParams = new URLSearchParams(initData);
        const userData = searchParams.get('user');
        
        if (!userData) {
            console.error('No user data found in initData');
            return false;
        }

        const user = JSON.parse(userData) as TelegramUser;
        console.log('Parsed user data:', { id: user.id, username: user.username });

        if (!user.id) {
            console.error('No user ID found in Telegram data');
            return false;
        }

        // Intentamos obtener el usuario existente
        console.log(`Checking if user ${user.id} exists...`);
        const { data: existingUser, error: fetchError } = await supabase
            .from('users_git2pdf_bot')
            .select('*')
            .eq('telegram_id', user.id)
            .single();

        // Si el usuario no existe (PGRST116) lo creamos
        if (fetchError?.code === 'PGRST116') {
            console.log(`User ${user.id} not found, creating new user...`);
            const newUser = {
                telegram_id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                language_code: user.language_code,
                status: 'pending'
            };
            
            if (user.username) {
                console.log(`Adding username ${user.username} to new user`);
                Object.assign(newUser, { telegram_username: user.username });
            }

            const { error: createError } = await supabase
                .from('users_git2pdf_bot')
                .insert(newUser);

            if (createError) {
                console.error('Error creating user:', createError);
                return false;
            }

            console.log(`User ${user.id} created successfully`);
            return true;
        } 
        
        // Si hay un error diferente a PGRST116
        if (fetchError) {
            console.error('Unexpected error fetching user:', fetchError);
            return false;
        }

        // Si el usuario existe
        console.log(`User ${user.id} found in database`);
        return true;
        
    } catch (error) {
        console.error('Critical error in authorization:', error);
        return false;
    }
} 