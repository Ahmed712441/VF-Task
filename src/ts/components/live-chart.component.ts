import {
  Chart as ChartJS,
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
  ChartData,
  ChartOptions,
  TooltipItem,
} from "chart.js";
import { eventBus } from "../utils/event-bus";
import { LiveChartData } from "../models/live-chart.model";
import "chartjs-adapter-date-fns";
import { SelectorComponent } from "./base.component";
import { FormatUtils } from "../utils/format";

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

export class LiveChartComponent extends SelectorComponent {
  private canvas: HTMLCanvasElement;
  private chart!: ChartJS;
  private selectedCrypto: LiveChartData | null = null;

  constructor(canvasSelector: string) {
    super(canvasSelector);
    this.canvas = this.container as HTMLCanvasElement;
    this.setupEventListeners();
    this.initializeChart();
  }

  /**
   * Initialize Chart.js
   */
  private initializeChart(): void {
    try {
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
    this.unsubscribeEvents.push(unsubscribe);
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
              return `${context.dataset.label}: $${context.formattedValue}`;
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
    if (!this.chart || !crypto) return;
    
    if (this.selectedCrypto){
      const lastTimestamp = this.selectedCrypto.historical_data.prices[
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
    this.chart.update('none');
    this.canvas.classList.add('chart-pulse');
    setTimeout(() => {
      this.canvas.classList.remove('chart-pulse');
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
   * Destroy the component
   */
  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
    super.destroy();
  }
}
