import { apiClient } from "@/api/client";
import type { AuthUser } from "@/api/types";

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>("/api/auth/mobile/login", {
    email: email.trim().toLowerCase(),
    password
  });
  return res.data;
}
