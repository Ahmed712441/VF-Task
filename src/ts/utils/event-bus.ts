import {
  AppEvents,
  EventBusInterface,
  EventCallback,
  EventMap,
} from "../models/event-bus.types";

export class EventBus<TEvents extends EventMap = EventMap>
  implements EventBusInterface<TEvents>
{
  private events: {
    [key in keyof TEvents]?: Array<EventCallback<TEvents[key]>>;
  } = {};

  /**
   * Subscribe to an event
   */
  subscribe<K extends keyof TEvents>(
    event: K,
    callback: EventCallback<TEvents[K]>,
  ): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.unsubscribe(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe<K extends keyof TEvents>(
    event: K,
    callback: EventCallback<TEvents[K]>,
  ): void {
    if (!this.events[event]) return;

    const index = this.events[event].indexOf(callback);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
  }

  /**
   * Publish an event
   */
  publish<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    if (!this.events[event]) return;

    this.events[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event as string}:`, error);
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
export const eventBus = new EventBus<AppEvents>();
