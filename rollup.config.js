import { defineConfig } from "rollup";
import preset from "@lumeweb/relay-plugin-rollup-preset";
import merger from "object-merger";

export default defineConfig(
  merger(preset(), {
    input: "src/index.ts",
    output: {
      file: "dist/discovery-bittorrent.js",
      format: "cjs",
    },
  })
);
