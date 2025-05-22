import { CryptoBasic, CryptoMarketData } from "../models/crypto.model";
import { CoinGeckoService } from "./coingecko.service";

export class CryptoService {
  private coinGeckoService: CoinGeckoService;
  private updateCallbacks: Array<(data: CryptoMarketData[]) => void> = [];
  private currentData: CryptoMarketData[] = [];
  private updateInterval: number | null = null;
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
      console.error('Failed to get top cryptocurrencies:', error);
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
      const ids = searchResults.map(crypto => crypto.id);
      return this.coinGeckoService.getCryptosByIds(ids);
    } catch (error) {
      console.error('Failed to get search results:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribeToPriceUpdates(
    callback: (data: CryptoMarketData[]) => void
  ): void {
    this.updateCallbacks.push(callback);
    
    // Start update interval if not already running
    if (!this.updateInterval) {
      this.startRealTimeUpdates();
    }
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPriceUpdates(callback: (data: CryptoMarketData[]) => void): void {
    
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(): void {
    this.updateInterval = window.setInterval(async () => {
      
    }, this.UPDATE_INTERVAL);

    console.log('Started real-time cryptocurrency updates');
  }

  /**
   * Stop real-time updates
   */
  private stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('Stopped real-time cryptocurrency updates');
    }
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
      const ids = this.currentData.map(crypto => crypto.id);
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
    this.stopRealTimeUpdates();
    this.updateCallbacks = [];
    this.currentData = [];
  }
}