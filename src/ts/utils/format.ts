export class FormatUtils {
  /**
   * Format price to USD currency
   */
  static formatPrice(
    price: number,
    minimumFractionDigits: number = 2,
    maximumFractionDigits: number = 6,
  ): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: minimumFractionDigits,
      maximumFractionDigits: maximumFractionDigits,
    }).format(price);
  }

  static formatTooltipPrice(price: number | null | undefined): string {
    if (price == null || price <= 0) {
      return "N/A";
    }

    let minimumFractionDigits = 8;
    let maximumFractionDigits = 10;

    // For very large prices (>= $1000)
    if (price >= 1000) {
      minimumFractionDigits = 0;
      maximumFractionDigits = 2;
    }
    // For medium prices ($10 - $999.99)
    else if (price >= 10) {
      minimumFractionDigits = 2;
      maximumFractionDigits = 2;
    }
    // For prices $1 - $9.99
    else if (price >= 1) {
      minimumFractionDigits = 2;
      maximumFractionDigits = 3;
    }
    // For small prices $0.1 - $0.999
    else if (price >= 0.1) {
      minimumFractionDigits = 3;
      maximumFractionDigits = 4;
    }
    // For very small prices $0.01 - $0.099
    else if (price >= 0.01) {
      minimumFractionDigits = 4;
      maximumFractionDigits = 6;
    }
    // For tiny prices $0.001 - $0.0099
    else if (price >= 0.001) {
      minimumFractionDigits = 6;
      maximumFractionDigits = 8;
    }
    // For micro prices < $0.001 - keeps default values

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(price);
  }

  /**
   * Format percentage change
   */
  static formatPercentage(percentage: number): string {
    if (!percentage) {
      console.warn("Percentage is null or undefined", percentage);
      return "0.00%";
    }
    const formatted = percentage.toFixed(2);
    return `${percentage >= 0 ? "+" : ""}${formatted}%`;
  }
}
