export interface RetryOptions {
  maxRetries: number;
  initialDelay?: number;
  backoffMultiplier?: number;
}
