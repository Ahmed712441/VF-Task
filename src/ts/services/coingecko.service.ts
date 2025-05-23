import { Primitives } from "../models/api.model";
import { CryptoBasic, CryptoHistoricalData, CryptoMarketData } from "../models/crypto.model";
import { HttpService } from "./http.service";


export class CoinGeckoService {
  private http: HttpService;
  private coinsListCache: CryptoBasic[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor(apiKey?: string) {
    this.http = new HttpService('https://api.coingecko.com/api/v3', apiKey);
    
    // Add request interceptor for logging
    this.http.addRequestInterceptor((config) => {
      console.log(`API Request: ${config.method?.toUpperCase() || 'GET'} ${config.url}`);
      return config;
    });

    // Add response interceptor for error handling
    this.http.addResponseInterceptor((response) => {
      return response;
    });
  }

  /**
   * Get list of cryptocurrencies with market data
   */
  async getMarketsData(options: {
    vsCurrency?: string;
    ids?: string[];
    order?: string;
    perPage?: number;
    page?: number;
    sparkline?: boolean;
    priceChangePercentage?: string;
  } = {}): Promise<CryptoMarketData[]> {
    const {
      vsCurrency = 'usd',
      ids = [],
      order = 'market_cap_desc',
      perPage = 10,
      page = 1,
      sparkline = true,
      priceChangePercentage = '24h'
    } = options;

    const params: Record<string, Primitives> = {
      vs_currency: vsCurrency,
      order,
      per_page: perPage,
      page,
      sparkline,
      price_change_percentage: priceChangePercentage
    };

    // Add ids if provided
    if (ids.length > 0) {
      params.ids = ids.join(',');
    }

    try {
      const data = await this.http.get<CryptoMarketData[]>('/coins/markets', params);
      return data;
    } catch (error) {
      console.error('Failed to fetch markets data:', error);
      throw new Error('Failed to fetch cryptocurrency market data');
    }
  }

  /**
   * Get top cryptocurrencies by market cap
   */
  async getTopCryptos(limit: number = 10): Promise<CryptoMarketData[]> {
    return this.getMarketsData({
      perPage: limit,
      page: 1
    });
  }

  /**
   * Get all coins list for search functionality (with caching)
   */
  async getCoinsList(): Promise<CryptoBasic[]> {
    // Return cached data if still valid
    if (this.coinsListCache !== null && Date.now() < this.cacheExpiry) {
      return this.coinsListCache;
    }

    try {
      console.log('Fetching fresh coins list from API...');
      const data = await this.http.get<CryptoBasic[]>('/coins/list');
      
      // Cache the data
      this.coinsListCache = data;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      console.log(`Cached ${data.length} coins for search functionality`);
      return data.map((coin) => ({
          id: coin.id,
          name: coin.name.toLowerCase(),
          symbol: coin.symbol.toLowerCase(),
        }));
    } catch (error) {
      console.error('Failed to fetch coins list:', error);
      
      // Return cached data if available, even if expired
      if (this.coinsListCache) {
        console.warn('Using expired cache due to API error');
        return this.coinsListCache;
      }
      
      throw new Error('Failed to fetch coins list for search');
    }
  }

  /**
   * Search cryptocurrencies by name or symbol
   */
  async searchCryptos(query: string, limit: number = 10): Promise<CryptoBasic[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const coinsList = await this.getCoinsList();
      const searchTerm = query.toLowerCase().trim();
      
      // Filter coins based on name or symbol
      const filteredCoins = coinsList.filter(coin => 
        coin.name.includes(searchTerm) || 
        coin.symbol.includes(searchTerm) ||
        coin.id.toLowerCase().includes(searchTerm)
      );

      // Return limited results
      return filteredCoins.slice(0, limit);
    } catch (error) {
      console.error('Failed to search cryptocurrencies:', error);
      throw new Error('Failed to search cryptocurrencies');
    }
  }

  /**
   * Get market data for specific cryptocurrency IDs
   */
  async getCryptosByIds(ids: string[],per_page:number=10): Promise<CryptoMarketData[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.getMarketsData({
      ids,
      perPage: per_page,
    });
  }

  /**
   * Get single cryptocurrency market data
   */
  async getCryptoHistoricalDataById(
    id: string,
    options: {
      vsCurrency?: string;
      days?: string;
    } = {}
  ): Promise<CryptoHistoricalData | null> {

    const {
      vsCurrency = 'usd',
      days = '1',
    } = options;

    const params: Record<string, Primitives> = {
      vs_currency: vsCurrency,
      days:days,
    };

    try {
      const data = await this.http.get<CryptoHistoricalData>(`/coins/${id}/market_chart`, params);
      return data || null;
    } catch (error) {
      console.error(`Failed to fetch crypto with id ${id}:`, error);
      return null;
    }
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.coinsListCache = null;
    this.cacheExpiry = 0;
    console.log('CoinGecko service cache cleared');
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    return this.coinsListCache !== null && Date.now() < this.cacheExpiry;
  }

  /**
   * Get cache info for debugging
   */
  getCacheInfo(): { hasCache: boolean; isValid: boolean; expiresIn: number; coinsCount: number } {
    return {
      hasCache: this.coinsListCache !== null,
      isValid: this.isCacheValid(),
      expiresIn: Math.max(0, this.cacheExpiry - Date.now()),
      coinsCount: this.coinsListCache?.length || 0
    };
  }
}