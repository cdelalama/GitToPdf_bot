import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useLogs } from "@/hooks/useLogs";
import { useToast } from "@/components/ui/use-toast";

const LogsPage = () => {
    const [selectedLevel, setSelectedLevel] = useState("all");
    const { toast } = useToast();
    const { logs, isLoading, error, refresh } = useLogs({
        level: selectedLevel === 'all' ? undefined : selectedLevel
    });

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

    const handleRefresh = async () => {
        try {
            refresh();
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudieron actualizar los logs",
                variant: "destructive"
            });
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
                        onClick={handleRefresh} 
                        disabled={isLoading}
                        className="gap-2"
                    >
                        {isLoading ? (
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
                        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un nivel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                                <SelectItem value="warn">Warning</SelectItem>
                                <SelectItem value="info">Info</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Logs del Sistema</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error ? (
                            <div className="text-center p-8 text-red-500">
                                Error al cargar los logs. Por favor, intenta de nuevo.
                            </div>
                        ) : isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center p-8 text-gray-500">
                                No hay logs que mostrar
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {logs.map(log => (
                                    <div key={log.id} className="p-4 border rounded-lg">
                                        <div className="flex items-start gap-4">
                                            {getLevelIcon(log.level)}
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-medium">
                                                        {log.action || 'System Log'}
                                                    </p>
                                                    <span className="text-sm text-gray-500">
                                                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 mt-1">{log.message}</p>
                                                {log.details && (
                                                    <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-500 bg-gray-50 p-2 rounded">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                )}
                                                {log.user_id && (
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        User ID: {log.user_id}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default LogsPage; 