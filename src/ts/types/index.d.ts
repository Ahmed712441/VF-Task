import { CryptoDashboardApp } from "../app";

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    APP_COINGECKO_API_KEY: string;
  }
}

declare global {
  interface Window {
    cryptoApp: CryptoDashboardApp;
  }
}
