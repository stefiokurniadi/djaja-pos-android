import axios, { AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/lib/config";

export const TOKEN_KEY = "djajapos.token";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: { "content-type": "application/json" }
});

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
}

apiClient.interceptors.request.use(async (config) => {
  const token = inMemoryToken ?? (await AsyncStorage.getItem(TOKEN_KEY));
  if (token) {
    inMemoryToken = token;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Extract a human-readable message from an API error. */
export function apiErrorMessage(error: unknown, fallback = "Terjadi kesalahan"): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (error.code === "ECONNABORTED") return "Koneksi timeout";
    if (error.message === "Network Error") return "Tidak dapat terhubung ke server";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 401;
}
