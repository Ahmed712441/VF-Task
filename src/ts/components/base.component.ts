export abstract class BaseComponent {
  protected subscriptions: Array<() => void> = [];

  destroy(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions = [];
  }
}

export abstract class SelectorComponent extends BaseComponent {
  protected container: HTMLElement;

  constructor(containerSelector: string) {
    super();
    const container = document.querySelector(containerSelector);
    if (!container) {
      throw new Error(`Container element not found: ${containerSelector}`);
    }
    this.container = container as HTMLElement;
  }
}
