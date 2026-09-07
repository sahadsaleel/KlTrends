import { Alert as NativeAlert } from 'react-native';

export type AppAlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AppAlertConfig = {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
};

type AlertListener = (config: AppAlertConfig) => void;

let listener: AlertListener | null = null;

export const subscribeNativeAlert = (nextListener: AlertListener) => {
  listener = nextListener;
  return () => {
    if (listener === nextListener) listener = null;
  };
};

// The host renders a SweetAlert2-style dialog on Android/iOS. The native alert is
// retained only as a safe fallback before the app host has mounted.
export const AppAlert = {
  alert: (title: string, message?: string, buttons?: AppAlertButton[]) => {
    const config = { title, message, buttons };
    if (listener) listener(config);
    else NativeAlert.alert(title, message, buttons);
  },
};
