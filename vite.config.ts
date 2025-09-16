import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// 读取 package.json 中的版本号
const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // 定义环境变量
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  // Ensure proper base path for Tauri builds
  base: "./",
}))