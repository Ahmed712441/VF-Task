// webpack.config.js
import path from "path";
import { fileURLToPath } from "url";
import CopyPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import sass from "sass";
import webpack from "webpack";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const env = dotenv.config().parsed || {};

// Filter out variables that start with a specific prefix (optional security measure)
const envKeys = Object.keys(env).reduce((prev, next) => {
  // Only expose variables that start with 'APP_' or 'PUBLIC_' for security
  if (next.startsWith("APP_") || next.startsWith("PUBLIC_")) {
    prev[`process.env.${next}`] = JSON.stringify(env[next]);
  }
  return prev;
}, {});

// Always include NODE_ENV
envKeys["process.env.NODE_ENV"] = JSON.stringify(
  process.env.NODE_ENV || "development"
);

export default (env, argv) => {
  const isDev = argv.mode === 'development';
  console.log("isDev", isDev);
  console.log("isDev2", isDev2);
  return {
    mode: process.env.NODE_ENV || "development",
    entry: ["./src/ts/app.ts", "./src/scss/main.scss"],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            {
              loader: "sass-loader",
              options: {
                implementation: sass,
                api: "modern",
              },
            },
          ],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: "asset/resource",
          generator: {
            filename: "assets/img/[name][ext]",
          },
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    output: {
      filename: "js/[name].bundle.js",
      path: path.resolve(__dirname, isDev ? "dev-dist" : "dist"),
      clean: true,
    },
    plugins: [
      new CleanWebpackPlugin(),
      new MiniCssExtractPlugin({
        filename: "css/[name].css",
      }),
      new HtmlWebpackPlugin({
        template: "src/index.html",
        filename: "index.html",
        inject: true,
      }),
      // Define environment variables
      new webpack.DefinePlugin(envKeys),
      // Only copy public directory if it exists
      new CopyPlugin({
        patterns: [
          {
            from: "public",
            to: "public",
            noErrorOnMissing: true, // Don't error if directory doesn't exist
          },
        ],
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, "dev-dist"),
      },
      compress: true,
      port: 9000,
      hot: true,
      open: true,
    },
  };
};