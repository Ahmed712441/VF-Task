import { CryptoDashboardApp } from "../app";

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    APP_COINGECKO_API_KEY: string;
    APP_TABLE_POOLING_FREQUENCY: number;
    APP_LIVE_CHART_POOLING_FREQUENCY: number;
  }
}

declare global {
  interface Window {
    cryptoApp: CryptoDashboardApp;
  }
}
