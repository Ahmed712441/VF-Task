export class ChartUtils {
  /**
   * Create mini SVG chart from sparkline data
   */
  static createMiniChart(data: number[], width: number = 120, height: number = 40): string {
    if (!data || data.length === 0) {
      return '<div class="no-chart">No data</div>';
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    
    if (range === 0) {
      // Flat line case
      const y = height / 2;
      return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <line x1="0" y1="${y}" x2="${width}" y2="${y}" 
                stroke-width="1.5" fill="none"/>
        </svg>
      `;
    }

    // Calculate points
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    // Determine color class based on trend
    const isPositive = data[data.length - 1] >= data[0];
    const colorClass = isPositive ? 'mini-chart-positive' : 'mini-chart-negative';

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="${colorClass}">
        <polyline points="${points}"
                  stroke-width="1.5" 
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"/>
      </svg>
    `;
  }

  static generateSmartLabelsFromTimestamps(prices: [number, number][]): string[] {
    if (!prices || prices.length === 0) {
      return [];
    }

    const labels: string[] = [];
    const maxLabels = 8; // Maximum number of labels to show
    const dataLength = prices.length;
    
    // Calculate optimal interval to show approximately maxLabels
    const interval = Math.max(1, Math.floor(dataLength / maxLabels));
    
    // Determine time range for formatting
    const firstTimestamp = prices[0][0];
    const lastTimestamp = prices[prices.length - 1][0];
    const timeRangeHours = (lastTimestamp - firstTimestamp) / (1000 * 60 * 60);
    
    for (let i = 0; i < prices.length; i++) {
      if (i === 0 || i === prices.length - 1 || i % interval === 0) {
        const timestamp = prices[i][0];
        const date = new Date(timestamp);
        
        let label: string;
        
        if (timeRangeHours <= 6) {
          // Less than 6 hours - show time only
          label = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
        } else if (timeRangeHours <= 48) {
          // Up to 2 days - show date and time
          label = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            hour12: false 
          });
        } else {
          // More than 2 days - show date only
          label = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          });
        }
        
        labels.push(label);
      } else {
        labels.push('');
      }
    }

    return labels;
  }
  
}