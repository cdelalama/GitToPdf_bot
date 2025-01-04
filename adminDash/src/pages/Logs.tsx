import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, RefreshCcw, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { supabase } from "@/supabaseClient";

interface Log {
    id: number;
    timestamp: string;
    level: 'error' | 'warn' | 'info';
    message: string;
    details?: Record<string, unknown>;
    user_id?: number;
    action?: string;
}

const Logs = () => {
    const { toast } = useToast();
    const [logs, setLogs] = useState<Log[]>([
        {
            id: 1,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Bot iniciado correctamente',
            action: 'System Startup'
        },
        {
            id: 2,
            timestamp: new Date().toISOString(),
            level: 'warn',
            message: 'Intento de acceso no autorizado',
            user_id: 123456,
            action: 'Authentication'
        },
        {
            id: 3,
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error al procesar el repositorio',
            details: {
                repo: 'https://github.com/user/repo',
                error: 'Repository not found'
            },
            user_id: 789012,
            action: 'PDF Generation'
        }
    ]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState({
        level: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });

    const fetchLogs = async () => {
        // Temporarily disabled until database is ready
        /*
        setLoading(true);
        try {
            let query = supabase
                .from('bot_logs')
                .select('*');

            if (filter.level) {
                query = query.eq('level', filter.level);
            }
            if (filter.startDate) {
                query = query.gte('timestamp', filter.startDate.toISOString());
            }
            if (filter.endDate) {
                query = query.lte('timestamp', filter.endDate.toISOString());
            }

            const { data, error } = await query
                .order('timestamp', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los logs",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
        */
    };

    useEffect(() => {
        // fetchLogs();
    }, [filter]);

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'warn':
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'info':
                return <Info className="h-4 w-4 text-blue-500" />;
            default:
                return null;
        }
    };

    return (
        <DashboardLayout currentPage="/logs">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Logs</h2>
                        <p className="text-gray-500">
                            Visualiza y filtra los logs del sistema
                        </p>
                    </div>
                    <Button 
                        onClick={fetchLogs} 
                        disabled={loading}
                        className="gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCcw className="h-4 w-4" />
                        )}
                        Actualizar
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select
                                value={filter.level}
                                onValueChange={(value) => setFilter({ ...filter, level: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Nivel" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                    <SelectItem value="warn">Warning</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="space-y-2">
                                <span className="text-sm text-gray-500">Fecha inicio</span>
                                <Calendar
                                    mode="single"
                                    selected={filter.startDate}
                                    onSelect={(date) => setFilter({ ...filter, startDate: date })}
                                />
                            </div>

                            <div className="space-y-2">
                                <span className="text-sm text-gray-500">Fecha fin</span>
                                <Calendar
                                    mode="single"
                                    selected={filter.endDate}
                                    onSelect={(date) => setFilter({ ...filter, endDate: date })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : logs.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                No hay logs que mostrar
                            </CardContent>
                        </Card>
                    ) : (
                        logs.map((log) => (
                            <Card key={log.id}>
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        {getLevelIcon(log.level)}
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium">
                                                    {log.action || 'System Log'}
                                                </p>
                                                <span className="text-sm text-gray-500">
                                                    {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                                </span>
                                            </div>
                                            <p className="text-gray-700">{log.message}</p>
                                            {log.details && (
                                                <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-500 bg-gray-50 p-2 rounded">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                            {log.user_id && (
                                                <p className="text-sm text-gray-500">
                                                    User ID: {log.user_id}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Logs; 