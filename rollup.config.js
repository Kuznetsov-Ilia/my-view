import resolve from 'rollup-plugin-node-resolve';
export default {
  entry: 'src.js',
  format: 'cjs',
  plugins: [
    resolve({jsnext: true})
  ]
};
