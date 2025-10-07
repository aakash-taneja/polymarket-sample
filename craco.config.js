const webpack = require('webpack');

module.exports = {
  devServer: {
    proxy: {
      '/api/polymarket': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        pathRewrite: {
          '^/api/polymarket': ''
        },
        secure: true,
        logLevel: 'debug'
      }
    }
  },
  webpack: {
    configure: (webpackConfig) => {
      // Add polyfills for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "buffer": require.resolve("buffer/"),
        "crypto": require.resolve("crypto-browserify"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "zlib": require.resolve("browserify-zlib"),
        "util": require.resolve("util/"),
        "url": require.resolve("url/"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert/"),
        "os": require.resolve("os-browserify/browser"),
        "path": require.resolve("path-browserify"),
        "vm": require.resolve("vm-browserify"),
        "fs": false,
        "net": false,
        "tls": false,
        "child_process": false,
        "worker_threads": false,
      };

      // Add plugins to provide global variables
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        }),
      ];

      // Ignore source map warnings
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
      ];

      return webpackConfig;
    },
  },
};
