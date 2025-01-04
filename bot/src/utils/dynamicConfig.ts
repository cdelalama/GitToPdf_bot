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
        await this.refreshCache();
        return this.cache.has(key) ? this.cache.get(key) : defaultValue;
    }

    static async set(key: string, value: any, type: string = 'string', description?: string, updatedBy?: number): Promise<void> {
        const stringValue = type === 'json' ? JSON.stringify(value) : String(value);
        
        const { error } = await Database.supabase
            .from('bot_config')
            .upsert({
                key,
                value: stringValue,
                type,
                description,
                updated_by: updatedBy,
                updated_at: new Date()
            });

        if (error) throw error;
        
        // Actualizar cache
        this.cache.set(key, value);
        this.lastFetch = Date.now();
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