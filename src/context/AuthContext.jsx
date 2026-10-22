import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuarioFirebase, setUsuarioFirebase] = useState(null);
  const [perfil, setPerfil] = useState(null); // { rol, programaId, nombrePrograma, nombre }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const desuscribir = onAuthStateChanged(auth, async (u) => {
      setUsuarioFirebase(u);
      if (u) {
        try {
          const ref = doc(db, "usuarios", u.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setPerfil(snap.data());
          } else {
            setPerfil(null);
            setError(
              "Esta cuenta no tiene un perfil asignado en el sistema. Contacta al administrador."
            );
          }
        } catch (e) {
          setError("No se pudo cargar el perfil del usuario: " + e.message);
        }
      } else {
        setPerfil(null);
      }
      setCargando(false);
    });
    return desuscribir;
  }, []);

  const iniciarSesion = async (email, password) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (e) {
      setError(mensajeErrorAuth(e.code));
      return false;
    }
  };

  const cerrarSesion = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{ usuarioFirebase, perfil, cargando, error, iniciarSesion, cerrarSesion, setError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function mensajeErrorAuth(codigo) {
  switch (codigo) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Usuario o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    case "auth/invalid-email":
      return "El usuario ingresado no tiene un formato válido.";
    default:
      return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
