import { Database } from './database';

export class DynamicConfig {
    private static cache: Map<string, any> = new Map();
    private static cacheTimeout: number = 60000; // 1 minuto
    private static lastFetch: number = 0;

    private static async refreshCache(): Promise<void> {
        const now = Date.now();
        if (now - this.lastFetch < this.cacheTimeout) return;

        const { data: configs } = await Database.supabase
            .from('bot_config')
            .select('*');

        if (configs) {
            this.cache.clear();
            configs.forEach(config => {
                this.cache.set(config.key, this.parseValue(config.value, config.type));
            });
            this.lastFetch = now;
        }
    }

    private static parseValue(value: string, type: string): any {
        switch (type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return value.toLowerCase() === 'true';
            case 'json':
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            default:
                return value;
        }
    }

    static async get<T>(key: string, defaultValue: T): Promise<T> {
        try {
            const { data, error } = await Database.supabase
                .from('bot_config')
                .select('value, type')
                .eq('key', key)
                .single();

            if (error || !data) {
                console.log(`Using default value for ${key}:`, defaultValue);
                return defaultValue;
            }

            // Si es AUTO_APPROVE_USERS, logear el cambio
            if (key === 'AUTO_APPROVE_USERS') {
                console.log(`Auto-approve users setting: ${data.value}`);
            }

            switch (data.type) {
                case 'number':
                    return Number(data.value) as T;
                case 'boolean':
                    return (data.value.toLowerCase() === 'true') as T;
                case 'json':
                    return JSON.parse(data.value) as T;
                default:
                    return data.value as T;
            }
        } catch (error) {
            console.error(`Error getting config ${key}:`, error);
            return defaultValue;
        }
    }

    static async set(key: string, value: any): Promise<void> {
        try {
            const { error } = await Database.supabase
                .from('bot_config')
                .update({ value: String(value) })
                .eq('key', key);

            if (error) throw error;

            // Si es AUTO_APPROVE_USERS, logear el cambio
            if (key === 'AUTO_APPROVE_USERS') {
                console.log(`Auto-approve users setting changed to: ${value}`);
            }
        } catch (error) {
            console.error(`Error setting config ${key}:`, error);
            throw error;
        }
    }

    static async delete(key: string): Promise<void> {
        const { error } = await Database.supabase
            .from('bot_config')
            .delete()
            .eq('key', key);

        if (error) throw error;
        this.cache.delete(key);
    }

    static async getAllConfigs(): Promise<any[]> {
        await this.refreshCache();
        return Array.from(this.cache.entries()).map(([key, value]) => ({
            key,
            value,
            type: typeof value
        }));
    }
} 