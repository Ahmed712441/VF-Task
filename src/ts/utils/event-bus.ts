export class EventBus {
  private events: { [key: string]: Array<(data: any) => void> } = {};

  /**
   * Subscribe to an event
   */
  subscribe(event: string, callback: (data: any) => void): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(event: string, callback: (data: any) => void): void {
    if (!this.events[event]) return;
    
    const index = this.events[event].indexOf(callback);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
  }

  /**
   * Publish an event
   */
  publish(event: string, data: any): void {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }

  /**
   * Clear all event listeners
   */
  clear(): void {
    this.events = {};
  }
}

// Create global event bus instance
export const eventBus = new EventBus();