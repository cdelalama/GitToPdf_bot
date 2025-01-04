import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";

const LogsPage = () => {
    const [loading, setLoading] = useState(false);

    const handleRefresh = async () => {
        try {
            setLoading(true);
            // TODO: Implementar la lógica de actualización
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
        } catch (error) {
            console.error('Error al actualizar logs:', error);
        } finally {
            setLoading(false);
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
                        <CardTitle>Logs del Sistema</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Test Logs Page</p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default LogsPage; 