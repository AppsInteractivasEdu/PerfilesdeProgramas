import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Navbar({ titulo, subtitulo }) {
  const { cerrarSesion, perfil } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-[2400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img
            src="./logo-unimagdalena.png"
            alt="Universidad del Magdalena"
            className="h-10 w-10 object-contain"
          />
          <div>
            <p className="font-bold text-slate-800 dark:text-white">{titulo}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
            {perfil?.nombre}
          </span>
          <button type="button" className="btn-secondary" onClick={cerrarSesion}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
