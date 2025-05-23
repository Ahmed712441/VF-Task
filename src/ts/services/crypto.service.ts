import {
  CryptoBasic,
  CryptoHistoricalData,
  CryptoMarketData,
} from "../models/crypto.model";
import { CoinGeckoService } from "./coingecko.service";

export class CryptoService {
  private coinGeckoService: CoinGeckoService;
  private updateCallbacks: Map<
    string,
    Array<(data: CryptoHistoricalData, id: string) => void>
  > = new Map();
  private currentData: CryptoMarketData[] = [];
  private updateIntervals: Map<string, number> = new Map();
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds

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
   * Subscribe to real-time price updates
   */
  subscribeToPriceUpdates(
    callback: (data: CryptoHistoricalData, id: string) => void,
    coinId: string,
  ): void {
    if (!this.updateCallbacks.has(coinId)) {
      this.updateCallbacks.set(coinId, []);
    }

    this.updateCallbacks.get(coinId)!.push(callback);

    // Start update interval if not already running
    if (!this.updateIntervals.has(coinId)) {
      this.startRealTimeUpdates(coinId);
    }
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPriceUpdates(
    callback: (data: CryptoHistoricalData, id: string) => void,
    coinId: string,
  ): void {
    const callbacks = this.updateCallbacks.get(coinId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }

      // If no more callbacks for this coin, stop updates
      if (callbacks.length === 0) {
        this.stopRealTimeUpdates(coinId);
      }
    }
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(coinId: string): void {
    if (this.updateIntervals.has(coinId)) {
      console.warn(`Real-time updates for ${coinId} are already running.`);
      return;
    }

    const intervalFunction = async () => {
      try {
        const updatedData =
          await this.coinGeckoService.getCryptoHistoricalDataById(coinId);
        const callbacks = this.updateCallbacks.get(coinId);

        if (callbacks && updatedData) {
          callbacks.forEach((callback) => {
            try {
              callback(updatedData, coinId);
            } catch (error) {
              console.error(
                `Error in real-time update callback for ${coinId}:`,
                error,
              );
            }
          });
        }
      } catch (error) {
        console.error(`Failed to update real-time data for ${coinId}:`, error);
      }
    };
    intervalFunction();

    const intervalId = window.setInterval(
      intervalFunction,
      this.UPDATE_INTERVAL,
    );
    this.updateIntervals.set(coinId, intervalId);
    console.log(`Started real-time cryptocurrency updates for ${coinId}`);
  }

  /**
   * Stop real-time updates
   */
  public stopRealTimeUpdates(coinId: string): void {
    if (this.updateIntervals.has(coinId)) {
      clearInterval(this.updateIntervals.get(coinId));
      this.updateIntervals.delete(coinId);
      this.updateCallbacks.delete(coinId);
      console.log(`Stopped real-time cryptocurrency updates for ${coinId}`);
    }
  }

  private stopAllRealTimeUpdates(): void {
    this.updateIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.updateCallbacks.clear();
    this.updateIntervals.clear();
    console.log("Stopped all real-time cryptocurrency updates");
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
    this.stopAllRealTimeUpdates();
    this.currentData = [];
  }
}
