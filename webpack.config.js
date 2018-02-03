var path = require('path');

module.exports = {
    entry: ['babel-polyfill', './js/main.js'],
    output: {
        filename: './bundle.js'
    }, 
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['env']
                }
            }
        ]
    }, 
    resolve:  {
      modules: [path.resolve(__dirname) + '/js', 'node_modules']
    }
};
