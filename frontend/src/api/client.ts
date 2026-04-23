import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// ── Configurable API and WebSocket base URLs ──
// In production (Vercel), these point to the Railway backend.
// In local dev, they fall back to relative paths handled by Vite proxy.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const WS_BASE = import.meta.env.VITE_WS_URL || '';

export { API_BASE, WS_BASE };

let accessToken: string | null = null;
let refreshToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}> = [];

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const setRefreshToken = (token: string | null): void => {
  refreshToken = token;
};

export const getAccessToken = (): string | null => accessToken;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const processQueue = (error: AxiosError | null, token: string | null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
          `${API_BASE}/auth/refresh`,
          { refresh_token: refreshToken },
          { withCredentials: true }
        );
        const newToken = data.access_token;
        setAccessToken(newToken);
        if (data.refresh_token) setRefreshToken(data.refresh_token);
        processQueue(null, newToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 422) {
      const detail = (error.response.data as Record<string, unknown>)?.detail;
      if (Array.isArray(detail)) {
        const messages = detail.map(
          (d: { msg: string; loc: string[] }) => `${d.loc.slice(-1)[0]}: ${d.msg}`
        );
        toast.error(messages.join('\n'));
      }
    } else if (error.response?.status === 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export default api;
