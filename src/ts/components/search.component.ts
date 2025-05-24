import { eventBus } from "../utils/event-bus";
import { SelectorComponent } from "./base.component";

export class SearchComponent extends SelectorComponent {
  private inputElement: HTMLInputElement;
  private searchTimeout: number | null = null;
  private currentQuery: string = "";

  constructor(inputSelector: string) {
    super(inputSelector);
    this.inputElement = this.container as HTMLInputElement;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Input events
    this.inputElement.addEventListener("input", this.handleInput.bind(this));
    this.inputElement.addEventListener(
      "keydown",
      this.handleKeyDown.bind(this),
    );
  }

  /**
   * Handle input changes
   */
  private handleInput(e: Event): void {
    const query = (e.target as HTMLInputElement).value.trim();

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search
    this.searchTimeout = window.setTimeout(() => {
      if (query.length >= 2) {
        eventBus.publish("search:query", { query });
      } else {
        if (query.length === 0) {
          this.currentQuery = "";
          eventBus.publish("search:clear", {});
        }
      }
    }, 300);
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case "Enter": {
        e.preventDefault();
        const query = this.inputElement.value.trim();
        if (query && this.currentQuery !== query) {
          this.currentQuery = query;
          eventBus.publish("search:submit", { query });
        }
        break;
      }
    }
  }

  /**
   * Clear search
   */
  clear(): void {
    this.inputElement.value = "";
  }

  /**
   * Get current search value
   */
  getValue(): string {
    return this.inputElement.value.trim();
  }

  /**
   * Set search value
   */
  setValue(value: string): void {
    this.inputElement.value = value;
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    super.destroy();
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.inputElement.remove();
  }
}
