import { apiClient } from "@/api/client";

export type Branch = {
  id: string;
  name: string;
  companyId: string;
};

export async function fetchBranches(): Promise<Branch[]> {
  const res = await apiClient.get<{ branches: Branch[] }>("/api/branches");
  return res.data.branches;
}
