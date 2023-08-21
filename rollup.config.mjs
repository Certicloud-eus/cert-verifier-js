import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/verifier.js',
      format: 'cjs',
      name: 'Verifier'
    },
    {
      file: 'dist/verifier-es.js',
      format: 'es',
      name: 'Verifier'
    }
  ],
  plugins: [
    resolve({
      browser: true,
      mainFields: ['module', 'import', 'main'],
      preferBuiltins: true,
      extensions: ['.js', '.json']
    }),
    typescript(),
    commonjs(),
    json(),
    globals(),
    builtins(),
    visualizer({
      filename: 'bundle-esm-stats.html',
      title: 'Cert-Verifier-JS bundle stats',
      template: 'sunburst',
      open: true,
      gzipSize: true
    })
  ]
};
