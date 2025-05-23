import { RequestConfig, ApiError, Primitives } from "../models/api.model";

export class HttpService {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private requestInterceptors: Array<
    (config: RequestConfig<unknown>) => RequestConfig<unknown>
  > = [];
  private responseInterceptors: Array<(response: unknown) => unknown> = [];

  constructor(baseURL: string, apiKey?: string) {
    this.baseURL = baseURL.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey || "";
  }

  // Add request interceptor with proper typing
  addRequestInterceptor<TData = unknown>(
    interceptor: (config: RequestConfig<TData>) => RequestConfig<TData>,
  ): void {
    this.requestInterceptors.push(
      interceptor as (config: RequestConfig<unknown>) => RequestConfig<unknown>,
    );
  }

  // Add response interceptor with proper typing
  addResponseInterceptor<TResponse = unknown>(
    interceptor: (response: TResponse) => TResponse,
  ): void {
    this.responseInterceptors.push(
      interceptor as (response: unknown) => unknown,
    );
  }

  private applyRequestInterceptors<TData>(
    config: RequestConfig<TData>,
  ): RequestConfig<TData> {
    return this.requestInterceptors.reduce(
      (acc, interceptor) => interceptor(acc) as RequestConfig<TData>,
      config as RequestConfig<unknown>,
    ) as RequestConfig<TData>;
  }

  private applyResponseInterceptors<TResponse>(response: TResponse): TResponse {
    return this.responseInterceptors.reduce(
      (acc, interceptor) => interceptor(acc) as TResponse,
      response,
    );
  }

  async request<TResponse, TData = unknown>(
    config: RequestConfig<TData>,
  ): Promise<TResponse> {
    // Apply request interceptors
    const finalConfig = this.applyRequestInterceptors(config);

    // Build URL
    const url = `${this.baseURL}${finalConfig.url}`;
    const urlWithParams = this.buildUrlWithParams(url, finalConfig.params);

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: finalConfig.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...finalConfig.headers,
      },
    };

    // Add API key header if available
    if (this.apiKey) {
      (fetchOptions.headers as Record<string, string>)["x-cg-demo-api-key"] =
        this.apiKey;
    }

    // Add body for POST/PUT requests
    if (
      finalConfig.data &&
      ["POST", "PUT", "PATCH"].includes(
        (finalConfig.method || "GET").toUpperCase(),
      )
    ) {
      fetchOptions.body = JSON.stringify(finalConfig.data);
    }

    try {
      const response = await fetch(urlWithParams, fetchOptions);

      if (!response.ok) {
        const error: ApiError = {
          message: `HTTP Error: ${response.status} ${response.statusText}`,
          status: response.status,
          code: "HTTP_ERROR",
        };
        throw error;
      }

      const data: TResponse = await response.json();

      // Apply response interceptors
      return this.applyResponseInterceptors<TResponse>(data);
    } catch (error) {
      console.error("HTTP Request failed:", error);
      throw this.handleError(error);
    }
  }

  private buildUrlWithParams(
    url: string,
    params?: Record<string, Primitives>,
  ): string {
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

  private handleError(error: unknown): ApiError {
    // If it's already an ApiError, return it
    if (this.isApiError(error)) {
      return error;
    }

    // If it's a standard Error
    if (error instanceof Error) {
      return {
        message: error.message,
        code: "NETWORK_ERROR",
      };
    }

    return {
      message: "An unknown error occurred",
      code: "UNKNOWN_ERROR",
    };
  }

  private isApiError(error: unknown): error is ApiError {
    return (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    );
  }

  // Convenience methods with improved typing
  async get<TResponse>(
    url: string,
    params?: Record<string, Primitives>,
    config?: Partial<
      Omit<RequestConfig<never>, "method" | "url" | "params" | "data">
    >,
  ): Promise<TResponse> {
    return this.request<TResponse, never>({
      method: "GET",
      url,
      params,
      ...config,
    });
  }

  async post<TResponse, TData = unknown>(
    url: string,
    data?: TData,
    config?: Partial<Omit<RequestConfig<TData>, "method" | "url" | "data">>,
  ): Promise<TResponse> {
    return this.request<TResponse, TData>({
      method: "POST",
      url,
      data,
      ...config,
    });
  }
}
