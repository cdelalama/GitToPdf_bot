import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";

const Index = () => {
  const [variables] = useState({
    BOT_TOKEN: "12345:ABCdefGHIjklMNOpqrsTUVwxyz",
    ADMIN_CHAT_ID: "123456789",
    WELCOME_MESSAGE: "Welcome to our bot!",
  });

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
              {Object.entries(variables).map(([key, value]) => (
                <div key={key} className="border-b pb-2">
                  <p className="text-sm font-medium text-gray-600">{key}</p>
                  <p className="text-sm text-gray-900 font-mono break-all">
                    {key.includes("TOKEN") ? "••••••••" : value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Bot Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Uptime</span>
                <span className="font-medium">24h 13m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Messages Processed</span>
                <span className="font-medium">1,234</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Users</span>
                <span className="font-medium">42</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;