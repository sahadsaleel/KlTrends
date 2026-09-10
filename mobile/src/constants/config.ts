import Constants from 'expo-constants';

import { Platform } from 'react-native';

const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;

const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
};

const normalizeApiUrl = (url: string): string => {
  const normalizedUrl = url.trim().replace(/\/$/, '');
  return normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
};

const getApiUrl = (): string => {
  const configuredUrl =
    readNonEmptyString(process.env.EXPO_PUBLIC_API_URL) ||
    readNonEmptyString(Constants.expoConfig?.extra?.apiUrl);

  // If a production/cloud URL (like Railway) is configured, always use it
  if (configuredUrl && !/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/i.test(configuredUrl)) {
    return normalizeApiUrl(configuredUrl);
  }

  // Only use local Wi-Fi auto-discovery if explicitly requested
  if (process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true') {
    if (Platform.OS === 'web') {
      return configuredUrl ? normalizeApiUrl(configuredUrl) : 'http://localhost:5000/api';
    }

    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
      (Constants as any).manifest?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000/api`;
      }
    }

    if (configuredUrl) {
      return normalizeApiUrl(configuredUrl);
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api';
    }
  }

  // Default to deployed Railway backend
  return configuredUrl ? normalizeApiUrl(configuredUrl) : DEFAULT_PRODUCTION_API_URL;
};

const DEFAULT_PRODUCTION_API_URL = 'https://kltrends.up.railway.app/api';

const apiUrl = getApiUrl();

// Log active API URL for developer visibility
console.log('[KlTrends API] Active Base URL:', apiUrl);

export const API_CONFIG = {
  BASE_URL: apiUrl,
  IS_CONFIGURED: true,
  // Increased timeout to accommodate cloud latency & mobile cellular networks
  TIMEOUT: 15000,
};
