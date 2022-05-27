const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
    //entry: ['./src/index.ts', './src/customVideoSource.js'],
    entry: ['./src/index.ts'],
    // devtool: 'source-map',
    optimization: {
        minimize: false,
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    devServer: {
        allowedHosts: [
            'eu.sokool.io',
        ],
        hot: false,
        client: false
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({ template: 'src/index.html' }),
        // copies necessary facemoji NPM package resources content to target dist directory
        new CopyPlugin({
            patterns: [
                {
                    from: 'avatar/**/*',
                    context: path.dirname(require.resolve('@0xalter/alter-core/package.json')),
                },
                {
                    from: 'facemoji/**/*',
                    context: path.dirname(require.resolve('@0xalter/alter-core/package.json')),
                },
                {
                    from: 'models/**/*',
                    context: path.dirname(require.resolve('@0xalter/alter-core/package.json')),
                },
                {
                    from: '*.json',
                    context: path.dirname(require.resolve('@0xalter/alter-core/package.json')),
                },
		 { from: 'public' },
		 { from: 'src/customVideoSource.js' },
		 { from: 'src/agora.html' },
		 { from: 'src/capture.html' },
		 { from: 'src/blendshapes.html' },
            ],
        }),
    ],
}
