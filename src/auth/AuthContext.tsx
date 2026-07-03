import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken, TOKEN_KEY } from "@/api/client";
import { login as loginRequest } from "@/api/auth";
import type { AuthUser, Role } from "@/api/types";

const USER_KEY = "djajapos.user";

export type ActiveBranch = {
  id: string;
  name: string;
};

function branchStorageKey(userId: string) {
  return `djajapos.activeBranch.${userId}`;
}

function canSwitchBranch(role: Role | undefined) {
  return role === "OWNER" || role === "ADMIN";
}

async function loadStoredBranch(userId: string): Promise<ActiveBranch | null> {
  try {
    const raw = await AsyncStorage.getItem(branchStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveBranch;
    if (parsed?.id && parsed?.name) return parsed;
  } catch {
    // ignore corrupt storage
  }
  return null;
}

async function resolveActiveBranch(user: AuthUser): Promise<ActiveBranch | null> {
  if (canSwitchBranch(user.role)) {
    const stored = await loadStoredBranch(user.id);
    if (stored) return stored;
  }
  if (user.branchId) {
    return { id: user.branchId, name: user.branchName ?? "—" };
  }
  return null;
}

type AuthState = {
  user: AuthUser | null;
  activeBranch: ActiveBranch | null;
  canSwitchBranch: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setActiveBranch: (branch: ActiveBranch) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeBranch, setActiveBranchState] = useState<ActiveBranch | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY)
        ]);
        if (token && storedUser) {
          setAuthToken(token);
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          setUser(parsedUser);
          setActiveBranchState(await resolveActiveBranch(parsedUser));
        }
      } catch {
        // ignore; treat as logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token, user: nextUser } = await loginRequest(email, password);
    setAuthToken(token);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(nextUser)]
    ]);
    setUser(nextUser);
    setActiveBranchState(await resolveActiveBranch(nextUser));
  }, []);

  const setActiveBranch = useCallback(
    async (branch: ActiveBranch) => {
      if (!user || !canSwitchBranch(user.role)) return;
      setActiveBranchState(branch);
      await AsyncStorage.setItem(branchStorageKey(user.id), JSON.stringify(branch));
    },
    [user]
  );

  const signOut = useCallback(async () => {
    setAuthToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setUser(null);
    setActiveBranchState(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      activeBranch,
      canSwitchBranch: canSwitchBranch(user?.role),
      isLoading,
      signIn,
      signOut,
      setActiveBranch
    }),
    [user, activeBranch, isLoading, signIn, signOut, setActiveBranch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
