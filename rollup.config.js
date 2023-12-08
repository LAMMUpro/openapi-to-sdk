import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import cleanup from "rollup-plugin-cleanup";

export default [
  {
    input: "./src/index.ts",
    output: {
      dir: "dist",
      format: "cjs",
      entryFileNames: "[name].cjs.js",
    },
    plugins: [resolve({
      preferBuiltins: false,
    }), commonjs(), typescript(), terser(), cleanup()],
    external: ['ts-morph']
  },
  // {
  //   input: "./src/index.ts",
  //   output: {
  //     dir: "dist",
  //     format: "esm",
  //     entryFileNames: "[name].esm.js",
  //   },
  //   plugins: [resolve({
  //     preferBuiltins: false,
  //   }), commonjs(), typescript(), terser({
  //     module: true
  //   }), cleanup()],
  // },
];
