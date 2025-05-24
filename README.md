# Cryptocurrency Real-time Dashboard

A real-time cryptocurrency tracking application built with TypeScript, displaying a searchable table and line chart with live updates.

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   npm install
   ```

2. **Set up environment:**
   Create a `.env` file in the root directory: (I left my .env with my API KEY so you can use it)
   ```bash
   APP_COINGECKO_API_KEY=YOUR_API_KEY
   APP_TABLE_POOLING_FREQUENCY=10 # in seconds
   APP_LIVE_CHART_POOLING_FREQUENCY=10 # in seconds
   ```

3. **Run the application:**
   ```bash
   # Development mode with hot reloading
   npm start
   
   # Or build for production
   npm run build
   npm run serve
   ```

## Technology Stack

- **Frontend**: TypeScript, SCSS
- **Data Management**: RxJS for reactive programming
- **Charts**: Chart.js for data visualization
- **Build Tool**: Webpack
- **API**: CoinGecko API v3

## Project Structure

```
project/
├── src/                  # Source code
│   ├── ts/               # TypeScript files
│   │   ├── components/   # UI components
│   │   ├── services/     # API and data services
│   │   ├── utils/        # Helper functions
│   │   ├── models/       # Type definitions/interfaces
│   │   ├── types/        # Gloabal type declerations
│   │   └── app.ts        # Main application entry
│   ├── scss/             # SCSS styles
│   │   ├── components/   # Component-specific styles and animations
│   │   ├── base/         # Base styles, variables
│   │   └── main.scss     # Main style entry point
│   └── index.html        # HTML entry point
├── dist/                 # Compiled output ( compiled by webpack )
│   ├── js/               # Compiled JavaScript
│   ├── css/              # Compiled CSS
│   └── index.html        # Copied/processed HTML
├── public/               # Static assets
│   └── images/           # Images
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── webpack.config.js     # Webpack configuration
├── eslint.config.js      # ESLint configuration
├── .env                  # Environment variables
└── README.md             # Project documentation
```

## Features

- **Real-time Updates**: Displays live cryptocurrency prices, automatically refreshed at configurable polling intervals (default: 30 seconds).
- **Interactive Search**: Client-side filtering of cryptocurrency data.
- **Live Charts**: Interactive 24-hour price charts showing data points at 5-minute intervals. The charts auto-update based on a configurable polling interval (default: 30 seconds). Built using Chart.js.
- **Responsive Design**: Modern UI with smooth animations for data updates.
- **Efficient Rendering**: Optimized list updates without full re-renders.

## Architecture Overview

### Services Layer
- **HTTP Service**: A wrapper around the Fetch API with enhanced error handling for more reliable network requests.
- **CoinGecko Service**: A dedicated integration layer for accessing CoinGecko API endpoints.
- **Crypto Service**: Builds on top of the CoinGecko Service to offer advanced features like observable streams for real-time .cryptocurrency updates, and also decoubles the app logic from being tied to certain 3rd party (e.g., CoinGecko).

### Components
- **Crypto List**: Renders and manages a dynamic list of cryptocurrencies with smooth animated updates for price changes.
- **Crypto Row**: Individual cryptocurrency entry in the Crypto List component, displaying key data along with a 7-day mini-chart
- **Live Chart**: Interactive 24-hour price chart for the selected cryptocurrency, providing real-time visualization.
- **Search Component**: Component which takes the search input from the user.

### Communication
Components communicate via a custom event bus using publish/subscribe pattern, ensuring loose coupling and maintainable code.

> Note: All published events can be found in `AppEvents Interface` in `src/ts/models/event-bus.types.ts`.

## Key Implementation Decisions

**Table Polling Strategy**: 30-second intervals chosen based on CoinGecko's cache update frequency (60s free tier, 45s pro tier) to balance real-time feel with API limitations. [Reference: CoinGecko Markets API](https://docs.coingecko.com/v3.0.1/reference/coins-markets)

**Search Implementation**: CoinGecko's market API endpoint doesn't support partial search functionality - only exact matches by ID, name, or category are supported. To enable proper search functionality, the full coin list is fetched and cached client-side for 30 minutes, allowing real-time filtering before API calls. [Reference: CoinGecko Coins List API](https://docs.coingecko.com/v3.0.1/reference/coins-list)

**Live Chart Data**: Used CoinGecko's market_chart endpoint for maximum data frequency (5-minute intervals with 24-hour timeframe). This approach was chosen over the 7-day chart data used in table rows, which only updates hourly, to provide the highest resolution real-time visualization. [Reference: CoinGecko Market Chart API](https://docs.coingecko.com/v3.0.1/reference/coins-id-market-chart)