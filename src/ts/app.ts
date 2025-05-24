import { CryptoService } from "./services/crypto.service";
import { CryptoListComponent } from "./components/crypto-list.component";
import { SearchComponent } from "./components/search.component";
import { LiveChartComponent } from "./components/live-chart.component";
import { CryptoMarketData } from "./models/crypto.model";
import { eventBus } from "./utils/event-bus";
import { Subscription } from "rxjs";
import { Retry } from "./utils/decorators";

const NUMBER_OF_SEARCH_QUERIES_RETRIES: number = 5;
const NUMBER_OF_INITIAL_DATA_LOADING_RETRIES: number = 5;

export class CryptoDashboardApp {
  private cryptoService: CryptoService;
  private cryptoListComponent!: CryptoListComponent;
  private searchComponent!: SearchComponent;
  private liveChartComponent!: LiveChartComponent;
  private currentCryptos: CryptoMarketData[] = [];
  private selectedCrypto: CryptoMarketData | null = null;
  private isSearchMode: boolean = false;
  private currentChartSubscription: Subscription | null = null;
  private currentTableSubscription: Subscription | null = null;
  private currentSearchQuery: string = "";

  constructor(apiKey?: string) {
    this.cryptoService = new CryptoService(apiKey);
    this.initializeComponents();
    this.setupEventListeners();
  }

  /**
   * Initialize all components
   */
  private initializeComponents(): void {
    try {
      this.cryptoListComponent = new CryptoListComponent("#cryptoTable");
      this.searchComponent = new SearchComponent("#cryptoSearch");
      this.liveChartComponent = new LiveChartComponent("#liveChart");

      console.log("All components initialized successfully");
    } catch (error) {
      console.error("Failed to initialize components:", error);
      this.showGlobalError("Failed to initialize application components");
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Search events
    eventBus.subscribe("search:clear", this.handleSearchClear.bind(this));
    eventBus.subscribe("search:submit", this.handleSearchSubmit.bind(this));

    // Crypto list events
    eventBus.subscribe(
      "cryptoList:cryptoRemoved",
      this.handleCryptoRemoved.bind(this),
    );

    // Auto-select first crypto for chart
    eventBus.subscribe(
      "cryptoList:rendered",
      this.handleListRendered.bind(this),
    );

    // Live chart events
    eventBus.subscribe(
      "crypto:select",
      this.startRealtimeChartUpdates.bind(this),
    );

    console.log("Event listeners setup complete");
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      // Load initial data
      await this.loadInitialData();

      console.log("Application initialized successfully");
    } catch (error) {
      console.error("Failed to initialize application:", error);
      this.showErrorState(
        "Failed to load cryptocurrency data. Please check your connection and try again.",
      );
    }
  }

  /**
   * Load initial cryptocurrency data
   */
  private async loadInitialData(): Promise<void> {
    try {
      this.currentCryptos = await this.getTopCryptos();
      this.cryptoListComponent.render(this.currentCryptos);
    } catch (error) {
      console.error("Failed to load initial data:", error);
      throw error;
    }
  }

  private startRealtimeChartUpdates(data: {
    id: string;
    data: CryptoMarketData;
  }): void {
    if (this.selectedCrypto?.id !== data.id) {
      if (this.currentChartSubscription) {
        this.currentChartSubscription.unsubscribe();
      }
      this.selectedCrypto = data.data;
      this.currentChartSubscription = this.cryptoService
        .getRealtimePriceUpdates(data.id)
        .subscribe((historicalData) => {
          eventBus.publish("crypto:live-data", {
            data: data.data,
            id: data.id,
            historical_data: historicalData,
          });
        });
    }
  }

  private startRealtimeTableUpdates() {
    if (this.currentTableSubscription) {
      this.currentTableSubscription.unsubscribe();
    }
    if (!this.currentCryptos.length) return;
    this.currentTableSubscription = this.cryptoService
      .getRealtimeTableUpdates(this.currentCryptos.map((crypto) => crypto.id))
      .subscribe((newList) => {
        this.handleTableUpdate(newList, false, true);
      });
  }

  /**
   * Handle updating crypto data in the table
   */
  private handleTableUpdate(
    newList: CryptoMarketData[],
    rerender: boolean = false,
    animating: boolean = false,
  ): void {
    this.currentCryptos = newList;
    if (rerender) {
      this.cryptoListComponent.render(this.currentCryptos);
    } else {
      this.cryptoListComponent.update(this.currentCryptos, animating); 
    }
  }

  /**
   * Handle search clear
   */
  private async handleSearchClear(): Promise<void> {
    if (this.isSearchMode && this.currentSearchQuery !== "") {
      this.isSearchMode = false;
      // Return to top cryptos
      try {
        this.cryptoListComponent.showLoading();
        const currentCryptos = await this.getTopCryptos();
        this.handleTableUpdate(currentCryptos, false, false);
        this.startRealtimeTableUpdates();
      } catch (error) {
        console.error("Failed to reload top cryptos:", error);
      } finally {
        this.cryptoListComponent.hideLoading();
        this.currentSearchQuery = "";
      }
    }
  }

  /**
   * Handle search submit
   */
  private async handleSearchSubmit(data: { query: string }): Promise<void> {
    if (
      !data.query ||
      data.query.trim() === "" ||
      data.query.length < 3 ||
      data.query === this.currentSearchQuery
    ) {
      // Ignore empty or too short queries, or if the query hasn't changed
      return;
    }
    try {
      this.isSearchMode = true;
      this.cryptoListComponent.showLoading();
      const results = await this.getSearchResults(data.query);
      if (results.length > 0) {
        this.handleTableUpdate(results, false, false);
        this.startRealtimeTableUpdates();
        this.currentSearchQuery = data.query;
      } else {
        this.cryptoListComponent.showEmpty(
          `No results found for "${data.query}"`,
        );
      }
    } catch (error) {
      console.error("Search submit failed:", error);
      this.showErrorState(
        `Failed to search for "${data.query}". Please try again later.`,
      );
      // reset search query to page initialization
      setTimeout(() => {
        this.currentSearchQuery = data.query;
        eventBus.publish("search:clear", {});
      }, 30000)
    } finally {
      this.cryptoListComponent.hideLoading();
    }
  }

  @Retry({
    maxRetries: NUMBER_OF_SEARCH_QUERIES_RETRIES,
    initialDelay: 700,
    backoffMultiplier: 2,
  })
  private async getSearchResults(query: string): Promise<CryptoMarketData[]> {
    const results = await this.cryptoService.getSearchResults(query);
    return results;
  }

  @Retry({
    maxRetries: NUMBER_OF_INITIAL_DATA_LOADING_RETRIES,
    initialDelay: 700,
    backoffMultiplier: 2,
  })
  private async getTopCryptos(): Promise<CryptoMarketData[]> {
    return await this.cryptoService.getTopCryptos(10);
  }

  /**
   * Handle crypto removal
   */
  private handleCryptoRemoved(data: { id: string }): void {
    // Remove from current data
    this.currentCryptos = this.currentCryptos.filter(
      (crypto) => crypto.id !== data.id,
    );

    // If no cryptos left, reload top cryptos
    if (this.currentCryptos.length === 0 && this.isSearchMode) {
      this.handleSearchClear();
    }
    this.startRealtimeTableUpdates();
  }

  /**
   * Handle list rendered (auto-select first crypto)
   */
  private handleListRendered(data: { count: number }): void {
    if (data.count > 0 && this.currentCryptos.length > 0) {
      // Auto-select first crypto for chart if none selected
      setTimeout(() => {
        eventBus.publish("crypto:select", {
          id: this.currentCryptos[0].id,
          data: this.currentCryptos[0],
        });
      }, 100);
      this.startRealtimeTableUpdates();
    }
  }

  /**
   * Show error state
   */
  private showErrorState(message: string): void {
    this.cryptoListComponent.showError(message, true);
  }

  /**
   * Show global error
   */
  private showGlobalError(message: string): void {
    const errorEl = document.createElement("div");
    errorEl.innerHTML = `
      <div style="background: #fee; color: #c53030; padding: 1rem; margin: 1rem; border-radius: 8px; border: 1px solid #fed7d7;">
        <strong>Error:</strong> ${message}
      </div>
    `;
    document.body.insertBefore(errorEl, document.body.firstChild);
  }

  /**
   * Destroy the application
   */
  destroy(): void {
    this.cryptoService.destroy();
    this.cryptoListComponent.destroy();
    this.searchComponent.destroy();
    this.liveChartComponent.destroy();
    eventBus.clear();
  }
}

// Initialize application when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!process.env.APP_COINGECKO_API_KEY) {
      throw new Error("Coingecko API key is not set in environment variables");
    }
    const apiKey = process.env.APP_COINGECKO_API_KEY;
    const app = new CryptoDashboardApp(apiKey);

    // Make app globally available for debugging
    window.cryptoApp = app;

    // Initialize the application
    await app.initialize();

    console.log("🚀 Cryptocurrency Dashboard loaded successfully!");
  } catch (error) {
    console.error("💥 Failed to initialize Cryptocurrency Dashboard:", error);

    // Show fallback error message
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; text-align: center; padding: 2rem;">
        <h1 style="color: #ef4444; margin-bottom: 1rem;">⚠️ Application Error</h1>
        <p style="margin-bottom: 2rem; color: #6b7280;">
          Failed to initialize the cryptocurrency dashboard.<br>
          Please check your internet connection and refresh the page.
        </p>
        <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
          🔄 Refresh Page
        </button>
      </div>
    `;
  }
});
