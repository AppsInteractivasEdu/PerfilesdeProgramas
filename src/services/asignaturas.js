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
import { ESTADO_ADMIN, ESTADO_REVISOR } from "../utils/constantes.js";

/** Suscribe en tiempo real a la lista de programas (para el selector del admin/decano). */
export function suscribirProgramas(cb) {
  const q = query(collection(db, "programas"), orderBy("nombre", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Suscribe en tiempo real a la lista de departamentos. */
export function suscribirDepartamentos(cb) {
  const q = query(collection(db, "departamentos"), orderBy("nombre", "asc"));
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

/** Suscribe en tiempo real a las asignaturas asignadas a un departamento (pueden ser de varios programas). */
export function suscribirAsignaturasPorDepartamento(departamentoId, cb) {
  const q = query(collection(db, "asignaturas"), where("departamentoId", "==", departamentoId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(porOrden));
  });
}

/** Suscribe en tiempo real a TODAS las asignaturas (panel de administrador y del decano). */
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

function leerRevision(componente, revisor) {
  return componente?.revisiones?.[revisor] || {};
}

/** Una sugerencia ya resuelta por el Director de Departamento (aprobada o rechazada). */
function cicloCerrado(rev) {
  return rev.estado === ESTADO_REVISOR.MODIFICAR && (rev.estadoAdmin || ESTADO_ADMIN.PENDIENTE) !== ESTADO_ADMIN.PENDIENTE;
}

/** Guarda la sugerencia resuelta en el historial de ese revisor para que no se pierda de los consolidados. */
function archivarCiclo(clave, revisor, rev) {
  return {
    [`componentes.${clave}.revisiones.${revisor}.historial`]: arrayUnion({
      sugerencia: rev.comentario || "",
      estadoAdmin: rev.estadoAdmin,
      comentarioAdmin: rev.comentarioAdmin || "",
      fecha: new Date().toISOString(),
    }),
  };
}

function reiniciarRevision(clave, revisor) {
  return {
    [`componentes.${clave}.revisiones.${revisor}.estado`]: ESTADO_REVISOR.PENDIENTE,
    [`componentes.${clave}.revisiones.${revisor}.comentario`]: "",
    [`componentes.${clave}.revisiones.${revisor}.fecha`]: null,
    [`componentes.${clave}.revisiones.${revisor}.estadoAdmin`]: ESTADO_ADMIN.PENDIENTE,
    [`componentes.${clave}.revisiones.${revisor}.comentarioAdmin`]: "",
    [`componentes.${clave}.revisiones.${revisor}.fechaAdmin`]: null,
  };
}

/** El revisor (director de programa, departamento o decano) aprueba un componente tal como está. */
export async function aprobarComponente(asignaturaId, clave, revisor) {
  const ref = doc(db, "asignaturas", asignaturaId);
  const actual = await leerComponente(ref, clave);
  const rev = leerRevision(actual, revisor);
  await updateDoc(ref, {
    ...(cicloCerrado(rev) ? archivarCiclo(clave, revisor, rev) : {}),
    ...reiniciarRevision(clave, revisor),
    [`componentes.${clave}.revisiones.${revisor}.estado`]: ESTADO_REVISOR.APROBADO,
    [`componentes.${clave}.revisiones.${revisor}.fecha`]: serverTimestamp(),
    [`componentes.${clave}.textoActualizado`]: false,
  });
}

/** El revisor envía una sugerencia de modificación con comentario obligatorio. */
export async function enviarSugerencia(asignaturaId, clave, revisor, comentario) {
  const ref = doc(db, "asignaturas", asignaturaId);
  const actual = await leerComponente(ref, clave);
  const rev = leerRevision(actual, revisor);
  await updateDoc(ref, {
    ...(cicloCerrado(rev) ? archivarCiclo(clave, revisor, rev) : {}),
    [`componentes.${clave}.revisiones.${revisor}.estado`]: ESTADO_REVISOR.MODIFICAR,
    [`componentes.${clave}.revisiones.${revisor}.comentario`]: comentario,
    [`componentes.${clave}.revisiones.${revisor}.fecha`]: serverTimestamp(),
    // una nueva sugerencia reabre la revisión del Director de Departamento
    [`componentes.${clave}.revisiones.${revisor}.estadoAdmin`]: ESTADO_ADMIN.PENDIENTE,
    [`componentes.${clave}.revisiones.${revisor}.comentarioAdmin`]: "",
    [`componentes.${clave}.textoActualizado`]: false,
  });
}

/**
 * El Director de Departamento edita el texto de cualquier componente.
 * Para cada revisor (director/departamento/decano) que ya lo había aprobado,
 * o cuya sugerencia fue aprobada y aplicada, esa revisión vuelve a quedar
 * "por aprobar" otra vez, porque el texto que vieron ya no es el mismo.
 */
export async function editarTextoComponente(asignaturaId, clave, texto) {
  const ref = doc(db, "asignaturas", asignaturaId);
  const actual = await leerComponente(ref, clave);
  if ((actual.valor ?? "") === texto) return;

  const campos = {
    [`componentes.${clave}.valor`]: texto,
    [`componentes.${clave}.fechaEdicion`]: serverTimestamp(),
  };
  if (clave === "idoneidad") {
    await updateDoc(ref, campos);
    return;
  }
  for (const [revisor, rev] of Object.entries(actual.revisiones || {})) {
    const sugerenciaAplicada = rev.estado === ESTADO_REVISOR.MODIFICAR && rev.estadoAdmin === ESTADO_ADMIN.APROBADO;
    const eraAprobado = rev.estado === ESTADO_REVISOR.APROBADO;
    if (sugerenciaAplicada || eraAprobado) {
      Object.assign(
        campos,
        sugerenciaAplicada ? archivarCiclo(clave, revisor, rev) : {},
        reiniciarRevision(clave, revisor)
      );
    }
  }
  campos[`componentes.${clave}.textoActualizado`] = true;
  await updateDoc(ref, campos);
}

/** El Director de Departamento aprueba la modificación solicitada por un revisor. */
export async function aprobarSolicitudAdmin(asignaturaId, clave, revisor) {
  const ref = doc(db, "asignaturas", asignaturaId);
  await updateDoc(ref, {
    [`componentes.${clave}.revisiones.${revisor}.estadoAdmin`]: ESTADO_ADMIN.APROBADO,
    [`componentes.${clave}.revisiones.${revisor}.comentarioAdmin`]: "",
    [`componentes.${clave}.revisiones.${revisor}.fechaAdmin`]: serverTimestamp(),
  });
}

/** El Director de Departamento rechaza la modificación, con comentario obligatorio. */
export async function rechazarSolicitudAdmin(asignaturaId, clave, revisor, comentario) {
  const ref = doc(db, "asignaturas", asignaturaId);
  await updateDoc(ref, {
    [`componentes.${clave}.revisiones.${revisor}.estadoAdmin`]: ESTADO_ADMIN.RECHAZADO,
    [`componentes.${clave}.revisiones.${revisor}.comentarioAdmin`]: comentario,
    [`componentes.${clave}.revisiones.${revisor}.fechaAdmin`]: serverTimestamp(),
  });
}
