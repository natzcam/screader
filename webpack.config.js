const webpack = require('webpack')

module.exports = {
  entry: "./bin/screader",
  target: 'node',
  mode: 'production',
  // optional: bundle everything into 1 file
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ],
}