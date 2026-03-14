import { defineConfig } from 'vite'
import path from "path"
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
   resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "Zenapt",
      fileName: "booking",
      formats: ["umd"],
    },
    minify: true,
    
  },
});
