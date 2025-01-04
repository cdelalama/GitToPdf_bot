import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTelegramWebApp } from "./hooks/useTelegramWebApp";
import Index from "./pages/Index";
import Variables from "./pages/Variables";

const queryClient = new QueryClient();

const App = () => {
  const { isReady, isValid, user } = useTelegramWebApp();

  if (!isReady) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-telegram-blue">Loading...</p>
    </div>;
  }

  if (!isValid) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-red-500">Invalid Telegram WebApp data</p>
    </div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-red-500">User data not available</p>
    </div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/variables" element={<Variables />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;