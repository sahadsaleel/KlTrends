import axios from 'axios';
import { API_CONFIG } from '../constants/config';
import { storage } from '../services/storage';

export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    if (!config.headers['Authorization']) {
      try {
        const token = await storage.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        // Ignore storage error
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};
