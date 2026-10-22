import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const stored = localStorage.getItem("tema");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* localStorage no disponible (modo privado, etc.): seguir con el valor por defecto */
  }
  const prefiereOscuro =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefiereOscuro ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(getInitialTheme);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === "dark") raiz.classList.add("dark");
    else raiz.classList.remove("dark");
    try {
      localStorage.setItem("tema", tema);
    } catch {
      /* ignorar: preferencia de tema no persistida en este navegador */
    }
  }, [tema]);

  const alternarTema = () => setTema((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
