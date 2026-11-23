import { useEffect, useState } from "react";

/**
 * Cuadro de diálogo inductivo que explica, en pocas líneas, qué se hace en
 * la pestaña a la que se acaba de entrar. Se muestra solo la primera vez por
 * cuenta y por pestaña (localStorage, por eso es por navegador: si la
 * persona entra desde otro equipo lo vuelve a ver una vez allí también), y
 * el usuario debe cerrarlo para empezar a usar la pestaña.
 */
export function useBienvenida(clave) {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (!clave) return;
    let vista = true;
    try {
      vista = localStorage.getItem(`bienvenida-${clave}`) === "1";
    } catch (e) {
      // sin localStorage (modo privado, etc.): se muestra siempre, sin romper nada.
    }
    setMostrar(!vista);
  }, [clave]);

  const cerrar = () => {
    setMostrar(false);
    try {
      localStorage.setItem(`bienvenida-${clave}`, "1");
    } catch (e) {
      // nada que hacer si no hay localStorage disponible.
    }
  };

  return [mostrar, cerrar];
}

export default function BienvenidaModal({ titulo, children, onCerrar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="card w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-institucional-navy dark:text-institucional-gold">{titulo}</h3>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {children}
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" className="btn-primary" onClick={onCerrar} autoFocus>
            Entendido, continuar
          </button>
        </div>
      </div>
    </div>
  );
}
