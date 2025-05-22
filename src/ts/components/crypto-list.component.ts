import { CryptoMarketData } from '../models/crypto.model';
import { CryptoRowComponent } from './crypto-row.component';
import { eventBus } from '../utils/event-bus';

export class CryptoListComponent {
  private container: HTMLElement;
  private tableBody: HTMLTableSectionElement;
  private cryptoRows: Map<string, CryptoRowComponent> = new Map();
  private isLoading: boolean = false;

  constructor(containerSelector: string) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      throw new Error(`Container element not found: ${containerSelector}`);
    }
    this.container = container as HTMLElement;
    this.tableBody = this.container.querySelector('#cryptoTableBody') as HTMLTableSectionElement;
    
    if (!this.tableBody) {
      throw new Error('Table body element not found');
    }

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    eventBus.subscribe('crypto:remove', this.removeCrypto.bind(this));
  }

  /**
   * Render cryptocurrency list
   */
  render(cryptos: CryptoMarketData[]): void {
    this.showLoading();
    
    // Clear existing rows
    this.clear();
    
    // Create new rows
    cryptos.forEach(crypto => {
      const rowComponent = new CryptoRowComponent(crypto);
      this.cryptoRows.set(crypto.id, rowComponent);
      this.tableBody.appendChild(rowComponent.getElement());
    });

    this.hideLoading();
    
    // Publish render complete event
    eventBus.publish('cryptoList:rendered', { count: cryptos.length });
  }

  /**
   * Update existing rows with new data
   */
  update(cryptos: CryptoMarketData[]): void {
    cryptos.forEach(crypto => {
      const existingRow = this.cryptoRows.get(crypto.id);
      if (existingRow) {
        existingRow.update(crypto);
      } else {
        // Add new crypto if not exists
        const newRow = new CryptoRowComponent(crypto);
        this.cryptoRows.set(crypto.id, newRow);
        this.tableBody.appendChild(newRow.getElement());
      }
    });

    // Remove cryptos that are no longer in the data
    const currentIds = new Set(cryptos.map(c => c.id));
    this.cryptoRows.forEach((row, id) => {
      if (!currentIds.has(id)) {
        this.removeCrypto({id});
      }
    });
  }

  /**
   * Remove a cryptocurrency from the list
   */
  private removeCrypto(data: {
    id: string;
    name?: string;
  }): void {
    const cryptoId = data.id;
    const rowComponent = this.cryptoRows.get(cryptoId);
    if (rowComponent) {
      // Add removal animation
      const element = rowComponent.getElement();
      element.style.animation = 'fadeOut 0.3s ease-out forwards';
      
      setTimeout(() => {
        rowComponent.destroy();
        this.cryptoRows.delete(cryptoId);
        
        // Publish removal event
        eventBus.publish('cryptoList:cryptoRemoved', { id: cryptoId });
      }, 300);
    }
  }

  /**
   * Filter displayed cryptocurrencies
   */
  filter(searchTerm: string): void {
    const term = searchTerm.toLowerCase().trim();
    
    this.cryptoRows.forEach(rowComponent => {
      const crypto = rowComponent.getData();
      const matches = 
        crypto.name.toLowerCase().includes(term) ||
        crypto.symbol.toLowerCase().includes(term) ||
        crypto.id.toLowerCase().includes(term);
      
      const element = rowComponent.getElement();
      element.style.display = matches || term === '' ? '' : 'none';
    });
  }

  /**
   * Show loading state
   */
  private showLoading(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.tableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="5" style="text-align: center; padding: 2rem;">
          <div class="loading-spinner">Loading...</div>
        </td>
      </tr>
    `;
  }

  /**
   * Hide loading state
   */
  private hideLoading(): void {
    this.isLoading = false;
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
  showEmpty(message: string = 'No cryptocurrencies found'): void {
    this.tableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-light);">
          <div class="empty-message">
            <i class="fas fa-search"></i>
            <p>${message}</p>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Clear all rows
   */
  clear(): void {
    this.cryptoRows.forEach(row => row.destroy());
    this.cryptoRows.clear();
    this.tableBody.innerHTML = '';
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
    return Array.from(this.cryptoRows.values()).map(row => row.getData());
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.clear();
    eventBus.unsubscribe('crypto:remove', this.removeCrypto);
  }
}