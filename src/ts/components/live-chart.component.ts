import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import { CryptoMarketData } from '../models/crypto.model';
import { eventBus } from '../utils/event-bus';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

export class LiveChartComponent {
  private canvas: HTMLCanvasElement;
  private chart!: ChartJS;
  private selectedCrypto: CryptoMarketData | null = null;

  constructor(canvasSelector: string) {
    const canvas = document.querySelector(canvasSelector);
    if (!canvas) {
      throw new Error(`Canvas element not found: ${canvasSelector}`);
    }
    this.canvas = canvas as HTMLCanvasElement;
    this.setupEventListeners();
    this.initializeChart();
  }

  /**
   * Initialize Chart.js
   */
  private initializeChart(): void {
    try {
      this.chart = new ChartJS(this.canvas, {
        type: 'line',
        data: this.getInitialData(),
        options: this.getChartOptions()
      });

      console.log('Chart initialized successfully');
    } catch (error) {
      console.error('Failed to initialize chart:', error);
      this.showChartError();
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    eventBus.subscribe('crypto:select', (data) => {
      this.selectCrypto(data.data);
    });

    eventBus.subscribe('cryptoList:rendered', (data) => {
      // Auto-select first crypto if none selected
      if (!this.selectedCrypto && data.count > 0) {
        // Will be handled by the first crypto selection
      }
    });
  }

  /**
   * Get initial chart data
   */
  private getInitialData(): ChartData<'line'> {
    return {
      labels: [],
      datasets: [{
        label: 'Select a cryptocurrency',
        data: [],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    };
  }

  /**
   * Get chart options
   */
  private getChartOptions(): ChartOptions<'line'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time (7 days)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Price (USD)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: function(value: string | number) {
              return '$' + Number(value).toLocaleString();
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context: TooltipItem<'line'>) {
              return `${context.dataset.label}: $${Number(context.raw).toLocaleString()}`;
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };
  }

  /**
   * Select a cryptocurrency for the chart
   */
  selectCrypto(crypto: CryptoMarketData): void {
    this.selectedCrypto = crypto;
    this.updateChart();
  }

  /**
   * Update chart with current crypto data
   */
  private updateChart(): void {
    if (!this.chart || !this.selectedCrypto) return;

    const sparklineData = this.selectedCrypto.sparkline_in_7d.price;
    const labels = this.generateTimeLabels(sparklineData.length);
    console.log('labels',labels)
    // Determine color based on trend
    const isPositive = this.selectedCrypto.price_change_percentage_24h >= 0;
    const borderColor = isPositive ? '#22c55e' : '#ef4444';
    const backgroundColor = isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    this.chart.data = {
      labels: labels,
      datasets: [{
        label: `${this.selectedCrypto.name} (${this.selectedCrypto.symbol.toUpperCase()})`,
        data: sparklineData,
        borderColor: borderColor,
        backgroundColor: backgroundColor,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: borderColor,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    };

    this.chart.update('none'); // No animation for real-time updates
  }

  /**
   * Generate time labels for chart
   */
  private generateTimeLabels(length: number): string[] {
    const labels: string[] = [];
    const now = new Date();
    const intervalHours = (7 * 24) / length; // 7 days divided by number of data points

    for (let i = 0; i < length; i++) {
      const time = new Date(now.getTime() - (length - 1 - i) * intervalHours * 60 * 60 * 1000);
      labels.push(time.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit'
      }));
    }

    return labels;
  }

  /**
   * Update chart with new data (for real-time updates)
   */
  update(cryptos: CryptoMarketData[]): void {
    if (!this.selectedCrypto) return;

    // Find updated data for selected crypto
    const updatedCrypto = cryptos.find(c => c.id === this.selectedCrypto!.id);
    if (updatedCrypto) {
      this.selectedCrypto = updatedCrypto;
      this.updateChart();
    }
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
  }
}