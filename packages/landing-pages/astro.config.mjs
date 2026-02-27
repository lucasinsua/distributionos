import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  site: "https://back.kintrion.com",
  output: "hybrid",
  adapter: node({ mode: "standalone" }),
  build: {
    assets: "_assets",
  },
});
