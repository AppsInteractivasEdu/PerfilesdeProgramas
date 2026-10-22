import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" produce rutas relativas en el build, para que funcione tanto en
// GitHub Pages (https://usuario.github.io/repo/) como en cualquier subcarpeta
// sin tener que conocer el nombre del repositorio de antemano.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
