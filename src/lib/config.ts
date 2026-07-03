import Constants from "expo-constants";

const PRODUCTION_API_URL = "https://djaja-pos-t3fx.vercel.app";

/**
 * API base URL. Production is the default for release builds.
 * Override with EXPO_PUBLIC_API_URL for local dev (e.g. http://10.0.2.2:3000 on emulator).
 */
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  PRODUCTION_API_URL;

/** Sales tax rate applied at checkout (0 = no tax). */
export const TAX_RATE = 0;
