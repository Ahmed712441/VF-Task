/* eslint-disable @typescript-eslint/no-explicit-any */
import { RetryOptions } from "../types/decorator";

/**
 * Method decorator that adds retry logic with exponential backoff to async methods
 */
export function Retry(options: RetryOptions) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> | void {
    if (!descriptor || typeof descriptor.value !== "function") {
      return;
    }

    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const {
        maxRetries,
        initialDelay = 1000,
        backoffMultiplier = 2,
      } = options;

      let lastError: any;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          if (attempt < maxRetries) {
            // Calculate delay with exponential backoff
            const delay = initialDelay * Math.pow(backoffMultiplier, attempt);

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            // Final failure throw error
            throw error;
          }
        }
      }

      throw lastError;
    } as T;

    return descriptor;
  };
}
