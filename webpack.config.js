const path = require('path');

module.exports = {
  entry: './lib/pltr/v2/index.js',
  target: 'node',
  output: {
    library: 'pltr',
    libraryTarget: 'umd',
    filename: 'index.js',
    path: path.resolve(__dirname, 'pltr-dist'),
  },
  mode: 'development',
};
