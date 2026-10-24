import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import DirectorDashboard from "./pages/DirectorDashboard.jsx";
import DepartamentoDashboard from "./pages/DepartamentoDashboard.jsx";
import DecanoDashboard from "./pages/DecanoDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  const { usuarioFirebase, perfil, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (!usuarioFirebase || !perfil) {
    return <Login />;
  }

  if (perfil.rol === "admin") return <AdminDashboard />;
  if (perfil.rol === "decano") return <DecanoDashboard />;
  if (perfil.rol === "departamento") return <DepartamentoDashboard />;
  if (perfil.rol === "director") return <DirectorDashboard />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900 px-4 text-center">
      <p className="text-slate-600 dark:text-slate-300">
        Tu cuenta no tiene un rol reconocido en el sistema. Contacta al
        Director de Departamento de Pedagogía.
      </p>
    </div>
  );
}
