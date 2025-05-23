export class SelectorComponent {
  protected unsubscribeEvents: Array<() => void> = [];
  protected container: HTMLElement;

  constructor(containerSelector: string) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      throw new Error(`Container element not found: ${containerSelector}`);
    }
    this.container = container as HTMLElement;
  }

  destroy(): void {
    this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeEvents = [];
  }
}
