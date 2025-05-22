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
  
}