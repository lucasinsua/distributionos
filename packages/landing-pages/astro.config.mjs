import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://learn.yourdomain.com",
  output: "static",
  build: {
    assets: "_assets",
  },
});
