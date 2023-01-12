import { merge } from 'webpack-merge';
import config from './webpack.common';

export default merge(config, {
    devtool: 'inline-source-map',
    mode: 'development'
});