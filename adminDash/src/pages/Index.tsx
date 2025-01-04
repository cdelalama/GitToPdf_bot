import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { useConfig } from "@/hooks/useConfig";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { configs, isLoading, error } = useConfig();

  if (isLoading) return (
    <DashboardLayout currentPage="/">
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout currentPage="/">
      <div className="flex items-center justify-center h-full text-red-500">
        Error loading configurations
      </div>
    </DashboardLayout>
  );

  const sensitiveKeys = ['TOKEN', 'KEY', 'SECRET', 'PASSWORD'];
  const shouldHideValue = (key: string) => 
    sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive));

  return (
    <DashboardLayout currentPage="/">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-500">Manage your Telegram bot settings</p>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto bg-green-50 text-green-700 border-green-200">
            Bot Online
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Current Variables</h3>
            <div className="space-y-4">
              {configs?.map((config) => (
                <div key={config.key} className="border-b pb-2">
                  <p className="text-sm font-medium text-gray-600">{config.key}</p>
                  <p className="text-sm text-gray-900 font-mono break-all">
                    {shouldHideValue(config.key) ? "••••••••" : config.value}
                  </p>
                  {config.description && (
                    <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Bot Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Variables</span>
                <span className="font-medium">{configs?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">String Variables</span>
                <span className="font-medium">
                  {configs?.filter(c => c.type === 'string').length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Number Variables</span>
                <span className="font-medium">
                  {configs?.filter(c => c.type === 'number').length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Boolean Variables</span>
                <span className="font-medium">
                  {configs?.filter(c => c.type === 'boolean').length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">JSON Variables</span>
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
};

export default Index;