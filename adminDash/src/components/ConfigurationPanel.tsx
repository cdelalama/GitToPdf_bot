import React from 'react';
import { useConfig } from '../hooks/useConfig';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Loader2 } from 'lucide-react';
import { useToast } from './ui/use-toast';
import DashboardLayout from './DashboardLayout';

interface ConfigItem {
    key: string;
    value: string;
    description: string | null;
    type: 'string' | 'number' | 'boolean' | 'json';
    updated_at: string;
    updated_by: number | null;
}

export const ConfigurationPanel = () => {
    const { configs, isLoading, error, updateConfig } = useConfig();
    const { toast } = useToast();

    const handleValueChange = async (key: string, value: string, type: 'string' | 'number' | 'boolean' | 'json') => {
        try {
            await updateConfig.mutateAsync({ key, value, type });
            toast({
                title: 'Configuration updated',
                description: `Successfully updated ${key}`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update configuration',
                variant: 'destructive',
            });
        }
    };

    const renderConfigInput = (config: ConfigItem) => {
        switch (config.type) {
            case 'boolean':
                return (
                    <Switch
                        checked={config.value === 'true'}
                        onCheckedChange={(checked) => 
                            handleValueChange(config.key, String(checked), 'boolean')
                        }
                    />
                );
            case 'number':
                return (
                    <Input
                        type="number"
                        value={config.value}
                        onChange={(e) => 
                            handleValueChange(config.key, e.target.value, 'number')
                        }
                    />
                );
            case 'json':
                return (
                    <textarea
                        className="w-full p-2 border rounded font-mono text-sm"
                        value={config.value}
                        onChange={(e) => 
                            handleValueChange(config.key, e.target.value, 'json')
                        }
                        rows={4}
                    />
                );
            default:
                return (
                    <Input
                        type="text"
                        value={config.value}
                        onChange={(e) => 
                            handleValueChange(config.key, e.target.value, 'string')
                        }
                    />
                );
        }
    };

    if (isLoading) return (
        <DashboardLayout currentPage="/variables">
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        </DashboardLayout>
    );

    if (error) return (
        <DashboardLayout currentPage="/variables">
            <div className="flex items-center justify-center h-full text-red-500">
                Error loading configurations
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout currentPage="/variables">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold">Variables</h2>
                        <p className="text-muted-foreground">Manage your bot variables and settings</p>
                    </div>
                    <Badge variant="outline" className="self-start sm:self-auto">
                        {configs?.length || 0} Variables
                    </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-4 sm:p-6">
                        <h3 className="text-lg font-semibold mb-4">Current Variables</h3>
                        <div className="space-y-4">
                            {configs?.map((config) => (
                                <div key={config.key} className="border-b pb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-medium">{config.key}</p>
                                            {config.description && (
                                                <p className="text-sm text-muted-foreground">{config.description}</p>
                                            )}
                                        </div>
                                        <Badge>{config.type}</Badge>
                                    </div>
                                    <div className="mt-2">
                                        {renderConfigInput(config)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Last updated: {new Date(config.updated_at).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6">
                        <h3 className="text-lg font-semibold mb-4">Bot Statistics</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Total Variables</span>
                                <span className="font-medium">{configs?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">String Variables</span>
                                <span className="font-medium">
                                    {configs?.filter(c => c.type === 'string').length || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Number Variables</span>
                                <span className="font-medium">
                                    {configs?.filter(c => c.type === 'number').length || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Boolean Variables</span>
                                <span className="font-medium">
                                    {configs?.filter(c => c.type === 'boolean').length || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">JSON Variables</span>
                                <span className="font-medium">
                                    {configs?.filter(c => c.type === 'json').length || 0}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
} 