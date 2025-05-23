import { CryptoMarketData } from "../models/crypto.model";
import { FormatUtils } from "../utils/format";
import { ChartUtils } from "../utils/chart";
import { eventBus } from "../utils/event-bus";

export class CryptoRowComponent {
  private data: CryptoMarketData;
  private element: HTMLTableRowElement;
  private isloading: boolean = false;

  constructor(data: CryptoMarketData) {
    this.data = data;
    this.element = this.createElement();
    this.attachEventListeners();
  }

  /**
   * Create the table row element
   */
  private createElement(): HTMLTableRowElement {
    const row = document.createElement("tr");
    row.className = "crypto-row";
    row.dataset.cryptoId = this.data.id;

    row.innerHTML = this.getRowHTML();

    return row;
  }

  /**
   * Generate HTML for the row
   */
  private getRowHTML(): string {
    const priceChangeClass =
      this.data.price_change_percentage_24h >= 0 ? "positive" : "negative";
    const formattedPrice = FormatUtils.formatPrice(this.data.current_price);
    const formattedChange = FormatUtils.formatPercentage(
      this.data.price_change_percentage_24h,
    );
    const miniChart = ChartUtils.createMiniChart(
      this.data.sparkline_in_7d.price,
    );

    return `
      <td data-label="Name">
        <div class="crypto-name-cell">
          <img
            src="${this.data.image}"
            alt="${this.data.name} logo"
            class="crypto-icon"
            onerror="this.src='/api/placeholder/32/32'"
          />
          <div>
            <div class="crypto-name">${this.data.name}</div>
          </div>
        </div>
      </td>
      <td class="price-cell" data-label="Price">
        <span class="price-value">${formattedPrice}</span>
      </td>
      <td class="change-cell" data-label="Change">
        <span class="change-value ${priceChangeClass}">${formattedChange}</span>
      </td>
      <td class="chart-cell" data-label="Chart (7d)">
        <div class="mini-chart">
          ${miniChart}
        </div>
      </td>
      <td data-label="Actions">
        <button class="remove-button" title="Remove ${this.data.name}">
          <i class="fas fa-times"></i>
        </button>
      </td>
    `;
  }

  private getLoadingHTML(): string {
    return `<tr>
      <td class="loading-cell">
        <div class="crypto-name-cell">
          <div>
            <div class="crypto-name"></div>
          </div>
        </div>
      </td>
      <td class="price-cell loading-cell" data-label="Price">
        <span class="price-value"></span>
      </td>
      <td class="change-cell loading-cell" data-label="Change">
        <span class="change-value"></span>
      </td>
      <td class="chart-cell loading-cell" data-label="Chart (7d)">
        <div class="mini-chart">
        </div>
      </td>
      <td class="loading-cell" data-label="Actions">
        <button class="remove-btn" data-crypto="">
        </button>
      </td>
    </tr>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const removeButton = this.element.querySelector(".remove-button");
    if (removeButton) {
      removeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleRemove();
      });
    }

    // Optional: Add click handler for the row
    this.element.addEventListener("click", () => {
      this.handleRowClick();
    });
  }

  /**
   * Handle remove button click
   */
  private handleRemove(): void {
    eventBus.publish("crypto:remove", {
      id: this.data.id,
      name: this.data.name,
    });
  }

  /**
   * Handle row click (optional feature)
   */
  private handleRowClick(): void {
    eventBus.publish("crypto:select", {
      id: this.data.id,
      data: this.data,
    });
  }

  /**
   * Update the row with new data
   */
  update(newData: CryptoMarketData,animating:boolean = false): void {
    const hasChanged = this.hasDataChanged(newData);

    if (hasChanged) {
      this.data = newData;
      // Add update animation class
      if (animating) this.element.classList.add("updating");

      // Update the content
      this.element.innerHTML = this.getRowHTML();

      // Re-attach event listeners
      this.attachEventListeners();

      // Remove animation class after animation completes
      if(animating){
        setTimeout(() => {
          this.element.classList.remove("updating");
        }, 300);
      }
    }
  }

  startLoading(): void {
    if (this.isloading) return;
    this.element.innerHTML = this.getLoadingHTML();
    this.isloading = true;
  }

  endLoading(): void {
    if (!this.isloading) return;
    this.element.innerHTML = this.getRowHTML();
    this.isloading = false;
  }

  /**
   * Check if data has changed
   */
  private hasDataChanged(newData: CryptoMarketData): boolean {
    return (
      this.data.current_price !== newData.current_price ||
      this.data.price_change_percentage_24h !==
        newData.price_change_percentage_24h ||
      JSON.stringify(this.data.sparkline_in_7d) !==
        JSON.stringify(newData.sparkline_in_7d)
    );
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLTableRowElement {
    return this.element;
  }

  /**
   * Get the crypto data
   */
  getData(): CryptoMarketData {
    return this.data;
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.element.remove();
  }
}
