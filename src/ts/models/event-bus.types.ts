import { CryptoMarketData } from "./crypto.model";
import { LiveChartData } from "./live-chart.model";

export type EventCallback<T = unknown> = (data: T) => void;

export interface EventMap {
  [eventName: string]: unknown;
}

export interface EventBusInterface<TEvents extends EventMap = EventMap> {
  subscribe<K extends keyof TEvents>(
    event: K,
    callback: EventCallback<TEvents[K]>,
  ): () => void;

  unsubscribe<K extends keyof TEvents>(
    event: K,
    callback: EventCallback<TEvents[K]>,
  ): void;

  publish<K extends keyof TEvents>(event: K, data: TEvents[K]): void;

  clear(): void;
}

export interface AppEvents extends EventMap {
  "cryptoList:rendered": { count: number };
  "cryptoList:cryptoRemoved": { id: string };
  "crypto:live-data": LiveChartData;
  "crypto:select": { id: string; data: CryptoMarketData };
  "crypto:remove": { id: string; name: string };
  "search:query": { query: string };
  "search:clear": object;
  "search:submit": { query: string };
  "cryptoList:back": object;
  "cryptoList:re-rendered": { count: number };
}
