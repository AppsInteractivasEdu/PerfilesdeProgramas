import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
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

async function leerComponente(ref, clave) {
  const snap = await getDoc(ref);
  return snap.data()?.componentes?.[clave] || {};
}

/** Una sugerencia ya resuelta por el Director de Departamento (aprobada o rechazada). */
function cicloCerrado(c) {
  return c.estadoDirector === ESTADO_DIRECTOR.MODIFICAR && (c.estadoAdmin || ESTADO_ADMIN.PENDIENTE) !== ESTADO_ADMIN.PENDIENTE;
}

/** Guarda la sugerencia resuelta en el historial para que no se pierda de los consolidados. */
function archivarCiclo(clave, c) {
  return {
    [`componentes.${clave}.historial`]: arrayUnion({
      sugerencia: c.comentarioDirector || "",
      estadoAdmin: c.estadoAdmin,
      comentarioAdmin: c.comentarioAdmin || "",
      fecha: new Date().toISOString(),
    }),
  };
}

function reiniciarRevision(clave) {
  return {
    [`componentes.${clave}.estadoDirector`]: ESTADO_DIRECTOR.PENDIENTE,
    [`componentes.${clave}.comentarioDirector`]: "",
    [`componentes.${clave}.fechaDirector`]: null,
    [`componentes.${clave}.estadoAdmin`]: ESTADO_ADMIN.PENDIENTE,
    [`componentes.${clave}.comentarioAdmin`]: "",
    [`componentes.${clave}.fechaAdmin`]: null,
  };
}

/** El director aprueba un componente tal como está. */
export async function aprobarComponenteDirector(asignaturaId, clave) {
  const ref = doc(db, "asignaturas", asignaturaId);
  const actual = await leerComponente(ref, clave);
  await updateDoc(ref, {
    ...(cicloCerrado(actual) ? archivarCiclo(clave, actual) : {}),
    ...reiniciarRevision(clave),
    [`componentes.${clave}.estadoDirector`]: ESTADO_DIRECTOR.APROBADO,
    [`componentes.${clave}.fechaDirector`]: serverTimestamp(),
    [`componentes.${clave}.textoActualizado`]: false,
  });
}

/** El director envía una sugerencia de modificación con comentario obligatorio. */
export async function enviarSugerenciaDirector(asignaturaId, clave, comentario) {
  const ref = doc(db, "asignaturas", asignaturaId);
  const actual = await leerComponente(ref, clave);
  await updateDoc(ref, {
    ...(cicloCerrado(actual) ? archivarCiclo(clave, actual) : {}),
    [`componentes.${clave}.estadoDirector`]: ESTADO_DIRECTOR.MODIFICAR,
    [`componentes.${clave}.comentarioDirector`]: comentario,
    [`componentes.${clave}.fechaDirector`]: serverTimestamp(),
    // una nueva sugerencia reabre la revisión del Director de Departamento
    [`componentes.${clave}.estadoAdmin`]: ESTADO_ADMIN.PENDIENTE,
    [`componentes.${clave}.comentarioAdmin`]: "",
    [`componentes.${clave}.textoActualizado`]: false,
  });
}

/**
 * El Director de Departamento edita el texto de cualquier componente.
 * Si el director ya lo había aprobado, o si su sugerencia fue aprobada y ahora
 * se aplica, el componente vuelve al director como "por aprobar".
 */
export async function editarTextoComponente(asignaturaId, clave, texto) {
  const ref = doc(db, "asignaturas", asignaturaId);
  const actual = await leerComponente(ref, clave);
  if ((actual.valor ?? "") === texto) return;

  const campos = {
    [`componentes.${clave}.valor`]: texto,
    [`componentes.${clave}.fechaEdicion`]: serverTimestamp(),
  };
  const sugerenciaAplicada =
    actual.estadoDirector === ESTADO_DIRECTOR.MODIFICAR && actual.estadoAdmin === ESTADO_ADMIN.APROBADO;
  const eraAprobado = actual.estadoDirector === ESTADO_DIRECTOR.APROBADO;

  if (sugerenciaAplicada || eraAprobado) {
    Object.assign(
      campos,
      sugerenciaAplicada ? archivarCiclo(clave, actual) : {},
      reiniciarRevision(clave),
      { [`componentes.${clave}.textoActualizado`]: true }
    );
  } else if ((actual.estadoDirector || ESTADO_DIRECTOR.PENDIENTE) === ESTADO_DIRECTOR.PENDIENTE) {
    campos[`componentes.${clave}.textoActualizado`] = true;
  }
  await updateDoc(ref, campos);
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
