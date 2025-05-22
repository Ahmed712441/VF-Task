import { RequestConfig, ApiError } from "../models/api.model";

export class HttpService {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig> = [];
  private responseInterceptors: Array<(response: any) => any> = [];

  constructor(baseURL: string, apiKey?: string) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey || '';
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: (response: any) => any): void {
    this.responseInterceptors.push(interceptor);
  }

  private applyRequestInterceptors(config: RequestConfig): RequestConfig {
    return this.requestInterceptors.reduce((acc, interceptor) => interceptor(acc), config);
  }

  private applyResponseInterceptors(response: any): any {
    return this.responseInterceptors.reduce((acc, interceptor) => interceptor(acc), response);
  }

  async request<T>(config: RequestConfig): Promise<T> {
    // Apply request interceptors
    const finalConfig = this.applyRequestInterceptors(config);
    
    // Build URL
    const url = `${this.baseURL}${finalConfig.url}`;
    const urlWithParams = this.buildUrlWithParams(url, finalConfig.params);

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: finalConfig.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...finalConfig.headers,
      },
    };

    // Add API key header if available
    if (this.apiKey) {
      (fetchOptions.headers as any)['x-cg-demo-api-key'] = this.apiKey;
    }

    // Add body for POST/PUT requests
    if (finalConfig.data && ['POST', 'PUT', 'PATCH'].includes((finalConfig.method || 'GET').toUpperCase())) {
      fetchOptions.body = JSON.stringify(finalConfig.data);
    }

    try {
      const response = await fetch(urlWithParams, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Apply response interceptors
      return this.applyResponseInterceptors(data);
    } catch (error) {
      console.error('HTTP Request failed:', error);
      throw this.handleError(error);
    }
  }

  private buildUrlWithParams(url: string, params?: Record<string, any>): string {
    if (!params) return url;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  private handleError(error: any): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'NETWORK_ERROR'
      };
    }
    
    return {
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR'
    };
  }

  // Convenience methods
  async get<T>(url: string, params?: Record<string, any>, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      ...config
    });
  }

  async post<T>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      ...config
    });
  }
}