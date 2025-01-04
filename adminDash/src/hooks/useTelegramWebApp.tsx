import { useEffect, useState } from 'react';

export const useTelegramWebApp = () => {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<{
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  } | null>(null);
  const [isValid, setIsValid] = useState(false);

  const webApp = window.Telegram?.WebApp;

  useEffect(() => {
    if (webApp) {
      // Initialize the WebApp
      webApp.ready();
      webApp.expand();
      
      // Validate initData
      const initData = webApp.initDataUnsafe;
      const isValidInitData = Boolean(
        initData.user?.id &&
        initData.auth_date &&
        initData.hash
      );
      
      setIsValid(isValidInitData);
      
      // Set user data if available and valid
      if (isValidInitData && initData.user) {
        setUser(initData.user);
      }
      
      setIsReady(true);
    }
  }, []);

  const closeApp = () => {
    webApp?.close();
  };

  const sendData = (data: unknown) => {
    if (!isValid) {
      console.error('Cannot send data: WebApp validation failed');
      return;
    }
    try {
      webApp?.sendData(JSON.stringify(data));
    } catch (error) {
      console.error('Error sending data to Telegram:', error);
    }
  };

  const enableClosingConfirmation = () => {
    webApp?.enableClosingConfirmation();
  };

  const disableClosingConfirmation = () => {
    webApp?.disableClosingConfirmation();
  };

  const setHeaderColor = (color: string) => {
    webApp?.setHeaderColor(color);
  };

  const setBackgroundColor = (color: string) => {
    webApp?.setBackgroundColor(color);
  };

  return {
    isReady,
    isValid,
    user,
    closeApp,
    sendData,
    enableClosingConfirmation,
    disableClosingConfirmation,
    setHeaderColor,
    setBackgroundColor,
    platform: webApp?.platform,
    version: webApp?.version,
  };
};