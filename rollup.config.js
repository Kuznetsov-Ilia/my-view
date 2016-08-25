import resolve from 'rollup-plugin-node-resolve';
export default {
  entry: 'index.es',
  format: 'cjs',
  plugins: [
    resolve({jsnext: true})
  ]
};
