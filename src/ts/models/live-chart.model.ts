import { CryptoHistoricalData, CryptoMarketData } from "./crypto.model";

export interface LiveChartData {
  id: string;
  data: CryptoMarketData;
  historical_data: CryptoHistoricalData;
}
