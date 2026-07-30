import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; webUrl?: string };

export const API_URL = extra.apiUrl ?? "https://voteright-dpimatrix.vercel.app";
export const WEB_URL = extra.webUrl ?? API_URL;
