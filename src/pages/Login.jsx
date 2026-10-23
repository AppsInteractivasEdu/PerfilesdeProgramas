import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function Login() {
  const { iniciarSesion, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setEnviando(true);
    await iniciarSesion(email.trim(), password);
    setEnviando(false);
  };

  return (
    <div className="relative min-h-screen bg-institucional-navyDark">
      <div className="absolute inset-0 bg-gradient-to-br from-institucional-navy via-institucional-navyDark to-slate-950" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <img
            src="./logo-unimagdalena.png"
            alt="Universidad del Magdalena"
            className="h-12 w-12 object-contain"
          />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-white">
              Portal de Perfiles Docentes
            </p>
            <p className="text-xs text-slate-300">
              Departamento de Pedagogía · Universidad del Magdalena
            </p>
          </div>
        </div>
        <ThemeToggle variant="dark" />
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-4 py-10">
        <div className="card w-full max-w-md p-8">
          <div className="mb-6 flex items-center justify-between">
            <img
              src="./logo-unimagdalena.png"
              alt="Universidad del Magdalena"
              className="h-14 w-14 object-contain"
            />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">
              Ciclo 2025-2026
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Validación de perfiles docentes · Licenciaturas — Departamento de
            Pedagogía
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="field-label">
                Usuario institucional
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej. director.programa@unimagdalena.app"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Contraseña
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={mostrarPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={
                    mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {mostrarPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="btn-primary w-full py-2.5"
            >
              {enviando ? "Ingresando…" : "Ingresar al sistema"}
            </button>
          </form>

          <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            🔒 Acceso restringido: uso exclusivo para directores de programa y
            personal autorizado del Departamento de Pedagogía.
          </p>
        </div>
      </main>

      <footer className="relative z-10 pb-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Departamento de Pedagogía · Universidad
        del Magdalena
      </footer>
    </div>
  );
}
