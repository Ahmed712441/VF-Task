import {
  CryptoBasic,
  CryptoHistoricalData,
  CryptoMarketData,
} from "../models/crypto.model";
import { CoinGeckoService } from "./coingecko.service";
import { Observable } from "rxjs";

export class CryptoService {
  private coinGeckoService: CoinGeckoService;
  private currentData: CryptoMarketData[] = [];
  private readonly TABLE_UPDATE_INTERVAL = process.env
    .APP_TABLE_POOLING_FREQUENCY
    ? parseInt(process.env.APP_TABLE_POOLING_FREQUENCY) * 1000
    : 30000; // 30 seconds
  private readonly LIVE_CHART_UPDATE_INTERVAL = process.env
    .APP_LIVE_CHART_POOLING_FREQUENCY
    ? parseInt(process.env.APP_LIVE_CHART_POOLING_FREQUENCY) * 1000
    : 30000; // 30 seconds

  constructor(apiKey?: string) {
    this.coinGeckoService = new CoinGeckoService(apiKey);
  }

  /**
   * Get top cryptocurrencies
   */
  async getTopCryptos(limit: number = 10): Promise<CryptoMarketData[]> {
    try {
      const data = await this.coinGeckoService.getTopCryptos(limit);
      this.currentData = data;
      return data;
    } catch (error) {
      console.error("Failed to get top cryptocurrencies:", error);
      throw error;
    }
  }

  /**
   * Search cryptocurrencies
   */
  async searchCryptos(query: string): Promise<CryptoBasic[]> {
    return this.coinGeckoService.searchCryptos(query);
  }

  /**
   * Get market data for searched cryptocurrencies
   */
  async getSearchResults(query: string): Promise<CryptoMarketData[]> {
    try {
      const searchResults = await this.searchCryptos(query);
      const ids = searchResults.map((crypto) => crypto.id);
      return this.coinGeckoService.getCryptosByIds(ids);
    } catch (error) {
      console.error("Failed to get search results:", error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time price updates for specific cryptocurrencies
   */
  getRealtimePriceUpdates(coinId: string): Observable<CryptoHistoricalData> {
    return new Observable<CryptoHistoricalData>((subscriber) => {
      console.log(`Starting real-time cryptocurrency updates for ${coinId}`);
      const intervalFunction = async () => {
        try {
          const updatedData =
            await this.coinGeckoService.getCryptoHistoricalDataById(coinId);
          if (updatedData) {
            subscriber.next(updatedData);
          } else {
            // subscriber.error(
            //   `No data found for coin ID: ${coinId}`
            // );
          }
        } catch (error) {
          console.log(`Error in real-time data update for ${coinId}: ${error}`);
          // subscriber.error(
          //   `Failed to update real-time data for ${coinId}: ${error}`
          // );
        }
      };
      intervalFunction();

      const intervalId = window.setInterval(
        intervalFunction,
        this.LIVE_CHART_UPDATE_INTERVAL,
      );

      return () => {
        clearInterval(intervalId);
        console.log(`Stopped real-time cryptocurrency updates for ${coinId}`);
      };
    });
  }

  getRealtimeTableUpdates(coinIds: string[]): Observable<CryptoMarketData[]> {
    return new Observable<CryptoMarketData[]>((subscriber) => {
      console.log(
        `Starting real-time cryptocurrency updates for table [${coinIds}]`,
      );
      const intervalFunction = async () => {
        try {
          const updatedData =
            await this.coinGeckoService.getCryptosByIds(coinIds);
          if (updatedData) {
            this.currentData = updatedData;
            subscriber.next(updatedData);
          } else {
            // subscriber.error(
            //   `Error in finding data for: [${coinIds}]`
            // );
          }
        } catch (error) {
          console.log(
            `Error in real-time data update for table [${coinIds}]: ${error}`,
          );
          // subscriber.error(
          //   `Error in finding data for: [${coinIds}]`
          // );
        }
      };

      const intervalId = window.setInterval(
        intervalFunction,
        this.TABLE_UPDATE_INTERVAL,
      );

      return () => {
        clearInterval(intervalId);
        console.log(
          `Stopped real-time cryptocurrency updates for table [${coinIds}]`,
        );
      };
    });
  }

  /**
   * Get current data
   */
  getCurrentData(): CryptoMarketData[] {
    return [...this.currentData];
  }

  /**
   * Manually refresh data
   */
  async refreshData(): Promise<CryptoMarketData[]> {
    if (this.currentData.length > 0) {
      const ids = this.currentData.map((crypto) => crypto.id);
      const updatedData = await this.coinGeckoService.getCryptosByIds(ids);
      this.currentData = updatedData;
      return updatedData;
    }
    return [];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.currentData = [];
    this.coinGeckoService.destroy();
  }
}
