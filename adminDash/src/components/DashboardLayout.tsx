import { Button } from "@/components/ui/button";
import { MessageSquare, Settings, Activity, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "react-router-dom";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

const DashboardLayout = ({ children, currentPage }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { icon: MessageSquare, label: "Bot Status", path: "/" },
    { icon: Settings, label: "Variables", path: "/variables" },
    { icon: Activity, label: "Logs", path: "/logs" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-telegram-blue">TeleAdmin</h1>
            <p className="text-sm text-gray-500">Bot Administration Panel</p>
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2",
                    currentPage === item.path && "bg-telegram-blue text-white hover:bg-telegram-blue/90"
                  )}
                  asChild
                >
                  <Link to={item.path}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8 pt-16 md:pt-8">
        {children}
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;