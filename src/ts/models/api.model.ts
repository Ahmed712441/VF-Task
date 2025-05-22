export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface RequestConfig {
  method?: string;
  url: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
}