import { join } from "path";
import CopyPlugin from "copy-webpack-plugin";
import * as webpack from "webpack";
import ESLintPlugin from "eslint-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";

const srcDir = join(__dirname, "src");

const config: webpack.Configuration = {
  entry: {
    background: join(srcDir, "background.ts"),
    extension: join(srcDir, "extension.ts"),
    popup: join(srcDir, "popup.tsx"),
    page: join(srcDir, "page.tsx"),
  },
  output: {
    path: join(__dirname, "dist/js"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "babel-loader",
          },
          {
            loader: "@linaria/webpack-loader",
            options: {
              sourceMap: process.env.NODE_ENV !== "production",
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(s)?css$/,
        exclude: /\.module\.(s)?css$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      // {
      //   test: /\.css$/i,
      //   use: [
      //     "style-loader",
      //     "@teamsupercell/typings-for-css-modules-loader",
      //     {
      //       loader: "css-loader",
      //       options: { modules: true },
      //     },
      //     "postcss-loader",
      //   ],
      // },
      {
        test: /\.module\.(s)?css$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "@teamsupercell/typings-for-css-modules-loader",
          },
          {
            loader: "css-loader",
            options: {
              modules: true,
              sourceMap: true,
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new CopyPlugin({
      // the `to` option is relative to the webpack output path (dist/js)
      patterns: [{ from: ".", to: "../", context: "public" }],
      options: {},
    }),
    new ESLintPlugin({
      emitError: true,
      emitWarning: true,
      failOnError: true,
      extensions: ["ts", "tsx", "js", "jsx"],
    }),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    }),
  ],
};
export default config;
