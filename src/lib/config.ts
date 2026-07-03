import Constants from "expo-constants";

/**
 * API base URL. Defaults to the Android emulator loopback (10.0.2.2 maps to the
 * host machine's localhost). Override via app.json `extra.apiUrl` or the
 * EXPO_PUBLIC_API_URL env var for a real device / production.
 */
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://10.0.2.2:3000";

/** Sales tax rate applied at checkout (0 = no tax). */
export const TAX_RATE = 0;
