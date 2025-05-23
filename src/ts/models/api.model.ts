export type Primitives = string | number | boolean;

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface RequestConfig<TData = unknown> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  params?: Record<string, Primitives>;
  data?: TData;
  headers?: Record<string, string>;
}
