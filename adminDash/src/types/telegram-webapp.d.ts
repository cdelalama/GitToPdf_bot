declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready(): void;
        close(): void;
        expand(): void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show(): void;
          hide(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
          enable(): void;
          disable(): void;
        };
        BackButton: {
          isVisible: boolean;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
          show(): void;
          hide(): void;
        };
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          auth_date?: string;
          hash?: string;
        };
        sendData(data: string): void;
        enableClosingConfirmation(): void;
        disableClosingConfirmation(): void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
        platform: string;
        version: string;
      };
    };
  }
}

export {}; 