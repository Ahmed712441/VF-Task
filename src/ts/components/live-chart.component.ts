// Type imports (these don't add to bundle size)
import type {
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  TooltipItem,
} from "chart.js";

import { eventBus } from "../utils/event-bus";
import { LiveChartData } from "../models/live-chart.model";
import { SelectorComponent } from "./base.component";
import { FormatUtils } from "../utils/format";

export class LiveChartComponent extends SelectorComponent {
  private canvas: HTMLCanvasElement;
  private chart!: ChartJS;
  private selectedCrypto: LiveChartData | null = null;
  private chartJSLoaded = false;
  private isInitializing = false;
  private loadingOn: string | null = null;

  constructor(canvasSelector: string) {
    super(canvasSelector);
    this.canvas = this.container as HTMLCanvasElement;
    this.setupEventListeners();
    this.initializeChart();
  }

  /**
   * Lazy load Chart.js and its dependencies
   */
  private async loadChartJS(): Promise<typeof ChartJS> {
    if (this.chartJSLoaded) {
      // Return the already loaded Chart constructor
      return (window as any).Chart;
    }

    try {
      // Show loading state while Chart.js loads
      this.showChartLoading("Chart library");

      // Dynamic import of Chart.js and its components
      const [
        { Chart: ChartJS },
        {
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          LineController,
          Title,
          TimeScale,
          Tooltip,
          Legend,
          Filler,
        },
      ] = await Promise.all([
        import("chart.js"),
        import("chart.js"),
        import("chartjs-adapter-date-fns" as any), // Date adapter
      ]);

      // Register Chart.js components
      ChartJS.register(
        CategoryScale,
        LinearScale,
        TimeScale,
        PointElement,
        LineElement,
        LineController,
        Title,
        Tooltip,
        Legend,
        Filler,
      );

      this.chartJSLoaded = true;
      console.log("Chart.js loaded successfully");

      return ChartJS;
    } catch (error) {
      console.error("Failed to load Chart.js:", error);
      this.showChartError();
      throw error;
    }
  }

  /**
   * Initialize Chart.js
   */
  private async initializeChart(): Promise<void> {
    if (this.isInitializing || this.chart) return;
    this.isInitializing = true;
    try {
      const ChartJS = await this.loadChartJS();
      this.chart = new ChartJS(this.canvas, {
        type: "line",
        data: this.getInitialData(),
        options: this.getChartOptions(),
      });
      console.log("Chart initialized successfully");
    } catch (error) {
      console.error("Failed to initialize chart:", error);
      this.showChartError();
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const unsubscribe = eventBus.subscribe("crypto:live-data", (data) => {
      this.updateChart(data);
    });
    this.subscriptions.push(unsubscribe);
    const unsubscribeSelectItemEvent = eventBus.subscribe(
      "crypto:select",
      (data) => {
        if (data && data.id && this.selectedCrypto?.id !== data.id) {
          this.showChartLoading(data.data.name);
        }
      },
    );
    this.subscriptions.push(unsubscribeSelectItemEvent);
  }

  /**
   * Get initial chart data
   */
  private getInitialData(): ChartData<"line"> {
    return {
      labels: [],
      datasets: [
        {
          label: "Select a cryptocurrency",
          data: [],
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }

  /**
   * Get chart options
   */
  private getChartOptions(): ChartOptions<"line"> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time", // Enable time scale
          display: true,
          title: {
            display: true,
            text: "Time (24 hours)",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
          time: {
            // For 24-hour crypto data, hour unit usually works well
            unit: "hour",
            displayFormats: {
              hour: "HH:mm", // Show time as 14:30, 15:00, etc.
              day: "MMM d", // Fallback for longer periods
            },
            tooltipFormat: "MMM d, HH:mm", // Detailed format for tooltips
          },
          ticks: {
            maxTicksLimit: 8, // Prevent overcrowding
            autoSkip: true,
            source: "auto",
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Price (USD)",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            callback: function (value: string | number) {
              if (typeof value === "string") {
                return FormatUtils.formatPrice(parseFloat(value));
              }
              return FormatUtils.formatPrice(value);
            },
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            title: function (context: TooltipItem<"line">[]) {
              // Format the timestamp in tooltip title
              return new Date(context[0].parsed.x).toLocaleString();
            },
            label: function (context: TooltipItem<"line">) {
              return `${context.dataset.label}: ${FormatUtils.formatTooltipPrice(context.parsed.y)}`;
            },
          },
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    };
  }

  /**
   * Update chart with current crypto data
   */
  private updateChart(crypto: LiveChartData): void {
    setTimeout(() => {
      if (this.loadingOn === crypto.data.name) {
        this.hideChartLoading();
      }
    }, 1000);

    if (!this.chart || !crypto) return;

    if (this.selectedCrypto && this.selectedCrypto.id === crypto.id) {
      const lastTimestamp =
        this.selectedCrypto.historical_data.prices[
          this.selectedCrypto.historical_data.prices.length - 1
        ][0];
      const currentLastTimestamp =
        crypto.historical_data.prices[
          crypto.historical_data.prices.length - 1
        ][0];
      if (Math.abs(lastTimestamp - currentLastTimestamp) < 1000) {
        // Timestamps are within 1 second, skip update
        return;
      }
    }

    this.selectedCrypto = crypto;

    const sparklineData = this.selectedCrypto.historical_data.prices.map(
      ([timestamp, price]) => {
        return {
          x: timestamp,
          y: price,
        };
      },
    );

    // Determine color based on trend
    const firstPrice = this.selectedCrypto.historical_data.prices[0]?.[1] || 0;
    const lastPrice =
      this.selectedCrypto.historical_data.prices[
        this.selectedCrypto.historical_data.prices.length - 1
      ]?.[1] || 0;
    const isPositive = lastPrice >= firstPrice;
    const borderColor = isPositive ? "#22c55e" : "#ef4444";
    const backgroundColor = isPositive
      ? "rgba(34, 197, 94, 0.1)"
      : "rgba(239, 68, 68, 0.1)";

    this.chart.data = {
      // labels:labels,
      datasets: [
        {
          label: `${this.selectedCrypto.data.name} (${this.selectedCrypto.data.symbol.toUpperCase()})`,
          data: sparklineData,
          borderColor: borderColor,
          backgroundColor: backgroundColor,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: borderColor,
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
        },
      ],
    };

    this.animateChartUpdate();
  }

  private animateChartUpdate(): void {
    this.chart.update("none");
    this.canvas.classList.add("chart-pulse");
    setTimeout(() => {
      this.canvas.classList.remove("chart-pulse");
    }, 800);
  }

  /**
   * Show chart error
   */
  private showChartError(): void {
    const container = this.canvas.parentElement;
    if (container) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 250px; color: var(--color-text-light);">
          <div style="text-align: center;">
            <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Chart could not be loaded</p>
            <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; border: 1px solid var(--color-border); border-radius: 4px; background: white; cursor: pointer;">
              Retry
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Show chart loading overlay
   */
  private showChartLoading(cryptoName: string): void {
    this.loadingOn = cryptoName;
    const container = this.canvas.parentElement;
    const isLoading = container?.querySelector(".chart-loading-overlay");
    if (isLoading) return;

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "chart-loading-overlay";
    loadingDiv.style.display = "flex";
    loadingDiv.innerHTML = `<div style="text-align: center;">
                <div class="chart-loading-spinner" style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
                <p>Loading Livechart data for ${cryptoName}...</p>
              </div>`;

    container?.appendChild(loadingDiv);
  }

  /**
   * hide chart loading overlay
   */
  private hideChartLoading(): void {
    const loadingDiv = this.canvas.parentElement?.querySelector(
      ".chart-loading-overlay",
    );
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    super.destroy();
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
