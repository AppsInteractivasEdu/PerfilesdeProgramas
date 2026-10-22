import { useTheme } from "../context/ThemeContext.jsx";

/**
 * variant="dark" se usa sobre fondos oscuros (p. ej. la pantalla de login)
 * donde el toggle siempre debe verse claro, sin depender del tema activo.
 */
export default function ThemeToggle({ variant }) {
  const { tema, alternarTema } = useTheme();
  const esOscuro = tema === "dark";

  const clasesBase =
    variant === "dark"
      ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";

  return (
    <button
      type="button"
      onClick={alternarTema}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${clasesBase}`}
      aria-label="Cambiar modo claro/oscuro"
      title={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo nocturno"}
    >
      <span aria-hidden="true">{esOscuro ? "☀️" : "🌙"}</span>
      <span className="hidden sm:inline">
        {esOscuro ? "Modo claro" : "Modo nocturno"}
      </span>
    </button>
  );
}
