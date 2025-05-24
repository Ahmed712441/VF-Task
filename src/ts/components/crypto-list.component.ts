import { CryptoMarketData } from "../models/crypto.model";
import { CryptoRowComponent } from "./crypto-row.component";
import { eventBus } from "../utils/event-bus";
import { SelectorComponent } from "./base.component";

export class CryptoListComponent extends SelectorComponent {
  private tableBody: HTMLTableSectionElement;
  private cryptoRows: Map<string, CryptoRowComponent> = new Map();
  private isLoading: boolean = false;

  constructor(containerSelector: string) {
    super(containerSelector);
    this.tableBody = this.container.querySelector(
      "#cryptoTableBody",
    ) as HTMLTableSectionElement;

    if (!this.tableBody) {
      throw new Error("Table body element not found");
    }

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const unsubscribe = eventBus.subscribe(
      "crypto:remove",
      this.removeCrypto.bind(this),
    );
    this.subscriptions.push(unsubscribe);
  }

  /**
   * Render cryptocurrency list
   */
  render(cryptos: CryptoMarketData[]): void {
    // Clear existing rows
    this.clear();

    // Create new rows
    const fragment = document.createDocumentFragment();
    cryptos.forEach((crypto) => {
      const rowComponent = new CryptoRowComponent(crypto);
      this.cryptoRows.set(crypto.id, rowComponent);
      fragment.appendChild(rowComponent.getElement());
    });
    this.tableBody.appendChild(fragment);

    // Publish render complete event
    eventBus.publish("cryptoList:rendered", { count: cryptos.length });
  }

  /**
   * Update existing rows with new data
   */
  update(cryptos: CryptoMarketData[], animating: boolean = false): void {
    const newCryptoRows = new Map<string, CryptoRowComponent>();
    const entriesInOrder = Array.from(this.cryptoRows.values());
    const hasRemovedItems = cryptos.length < entriesInOrder.length;
    const hasAddedItems = cryptos.length > entriesInOrder.length;
    const minLength = Math.min(cryptos.length, entriesInOrder.length);
    for (let i = 0; i < minLength; i++) {
      entriesInOrder[i].update(cryptos[i], animating);
      newCryptoRows.set(cryptos[i].id, entriesInOrder[i]);
    }
    if (hasRemovedItems) {
      for (let i = minLength; i < entriesInOrder.length; i++) {
        const row = entriesInOrder[i];
        row.destroy();
      }
    } else if (hasAddedItems) {
      const fragment = document.createDocumentFragment();
      for (let i = minLength; i < cryptos.length; i++) {
        const newRow = new CryptoRowComponent(cryptos[i]);
        newCryptoRows.set(cryptos[i].id, newRow);
        fragment.appendChild(newRow.getElement());
      }
      this.tableBody.appendChild(fragment);
    }
    this.cryptoRows = newCryptoRows;
    eventBus.publish("cryptoList:re-rendered", { count: cryptos.length });
  }

  /**
   * Remove a cryptocurrency from the list
   */
  private removeCrypto(data: { id: string; name?: string }): void {
    const cryptoId = data.id;
    const rowComponent = this.cryptoRows.get(cryptoId);
    if (rowComponent) {
      // Add removal animation
      const element = rowComponent.getElement();
      element.style.animation = "fadeOut 0.3s ease-out forwards";

      setTimeout(() => {
        rowComponent.destroy();
        this.cryptoRows.delete(cryptoId);

        // Publish removal event
        eventBus.publish("cryptoList:cryptoRemoved", { id: cryptoId });
      }, 300);
    }
  }

  /**
   * Show loading state
   */
  showLoading(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.cryptoRows.forEach((row) => row.startLoading());
  }

  /**
   * Hide loading state
   */
  hideLoading(): void {
    if (!this.isLoading) return;
    this.isLoading = false;
    this.cryptoRows.forEach((row) => row.endLoading());
  }

  /**
   * Show error state
   */
  showError(message: string): void {
    this.tableBody.innerHTML = `
      <tr class="error-row">
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-danger);">
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button onclick="location.reload()" class="retry-button">Retry</button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Show empty state
   */
  showEmpty(message: string = "No cryptocurrencies found"): void {
    this.tableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-light);">
          <div class="empty-message">
            <i class="fas fa-search"></i>
            <p>${message}</p>
            <button id="rstBtn" class="retry-button">Back</button>
          </div>
        </td>
      </tr>
    `;
    const cryptoData = this.getAllData();
    this.cryptoRows.forEach((row) => row.destroy()); // destroy as they are already dropped from HTML
    const retryButton = this.tableBody.querySelector("#rstBtn");
    retryButton?.addEventListener("click", () => {
      this.tableBody.innerHTML = "";
      this.render(cryptoData);
    });
  }

  /**
   * Clear all rows
   */
  clear(): void {
    this.cryptoRows.forEach((row) => row.destroy());
    this.cryptoRows.clear();
    this.tableBody.innerHTML = "";
  }

  /**
   * Get current cryptocurrency count
   */
  getCount(): number {
    return this.cryptoRows.size;
  }

  /**
   * Get all current cryptocurrency data
   */
  getAllData(): CryptoMarketData[] {
    return Array.from(this.cryptoRows.values()).map((row) => row.getData());
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    super.destroy();
    this.clear();
    this.container.remove();
  }
}
