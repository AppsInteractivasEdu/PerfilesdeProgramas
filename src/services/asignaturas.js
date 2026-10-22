import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

function porOrden(a, b) {
  return (a.orden ?? 0) - (b.orden ?? 0);
}
import { db } from "../firebase.js";
import { ESTADO_ADMIN, ESTADO_DIRECTOR } from "../utils/constantes.js";

/** Suscribe en tiempo real a la lista de programas (para el selector del admin). */
export function suscribirProgramas(cb) {
  const q = query(collection(db, "programas"), orderBy("nombre", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Suscribe en tiempo real a las asignaturas de un programa. cb recibe la lista. */
export function suscribirAsignaturasPorPrograma(programaId, cb) {
  // Sin orderBy en la consulta a propósito: combinarlo con el "where" exige
  // un índice compuesto en Firestore. A esta escala (decenas de filas por
  // programa) es más simple ordenar en el navegador.
  const q = query(collection(db, "asignaturas"), where("programaId", "==", programaId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(porOrden));
  });
}

/** Suscribe en tiempo real a TODAS las asignaturas (panel de administrador). */
export function suscribirTodasLasAsignaturas(cb) {
  const q = query(collection(db, "asignaturas"), orderBy("programaId", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** El director aprueba un componente tal como está. */
export async function aprobarComponenteDirector(asignaturaId, clave) {
  const ref = doc(db, "asignaturas", asignaturaId);
  await updateDoc(ref, {
    [`componentes.${clave}.estadoDirector`]: ESTADO_DIRECTOR.APROBADO,
    [`componentes.${clave}.comentarioDirector`]: "",
    [`componentes.${clave}.fechaDirector`]: serverTimestamp(),
  });
}

/** El director envía una sugerencia de modificación con comentario obligatorio. */
export async function enviarSugerenciaDirector(asignaturaId, clave, comentario) {
  const ref = doc(db, "asignaturas", asignaturaId);
  await updateDoc(ref, {
    [`componentes.${clave}.estadoDirector`]: ESTADO_DIRECTOR.MODIFICAR,
    [`componentes.${clave}.comentarioDirector`]: comentario,
    [`componentes.${clave}.fechaDirector`]: serverTimestamp(),
    // una nueva sugerencia reabre la revisión del administrador
    [`componentes.${clave}.estadoAdmin`]: ESTADO_ADMIN.PENDIENTE,
    [`componentes.${clave}.comentarioAdmin`]: "",
  });
}

/** El administrador aprueba la modificación solicitada por el director. */
export async function aprobarSolicitudAdmin(asignaturaId, clave) {
  const ref = doc(db, "asignaturas", asignaturaId);
  await updateDoc(ref, {
    [`componentes.${clave}.estadoAdmin`]: ESTADO_ADMIN.APROBADO,
    [`componentes.${clave}.comentarioAdmin`]: "",
    [`componentes.${clave}.fechaAdmin`]: serverTimestamp(),
  });
}

/** El administrador rechaza la modificación, con comentario obligatorio. */
export async function rechazarSolicitudAdmin(asignaturaId, clave, comentario) {
  const ref = doc(db, "asignaturas", asignaturaId);
  await updateDoc(ref, {
    [`componentes.${clave}.estadoAdmin`]: ESTADO_ADMIN.RECHAZADO,
    [`componentes.${clave}.comentarioAdmin`]: comentario,
    [`componentes.${clave}.fechaAdmin`]: serverTimestamp(),
  });
}
