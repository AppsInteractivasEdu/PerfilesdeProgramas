import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase.js";

export const MAX_GRUPOS = 10;
export const MAX_ESTUDIANTES = 50;
export const MAX_SUBGRUPOS = 5;

const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Práctica Pedagógica Investigativa I..VI o Práctica Profesional (independiente del componente en el que venga). */
function esPracticaInvestigativa(asignatura) {
  const n = sinTildes(asignatura).toLowerCase().trim();
  return /^practica pedagogica investigativa\b/.test(n) || /^practica profesional\b/.test(n);
}

/**
 * Programa + asignatura para los que un grupo se puede repartir en subgrupos (Docente 1..5):
 * en Licenciatura en Química, las de Saberes Específicos y Disciplinares y las de Práctica
 * Pedagógica Investigativa (incluida «Práctica Profesional» del plan anterior). En el plan de
 * transición estas últimas comparten componente con asignaturas de Didáctica que NO admiten
 * subgrupos, por eso se filtra por el nombre de la asignatura y no solo por el componente.
 */
export function admiteSubgrupos(fila) {
  if (fila?.programaId !== "quimica") return false;
  return fila.componente === "Saberes Específicos y Disciplinares" || esPracticaInvestigativa(fila.asignatura);
}

/**
 * Suscribe en tiempo real a las asignaturas de la oferta 2027-I de un programa.
 * cb recibe la lista ordenada como en el formato de necesidades (por acuerdo y por orden).
 */
export function suscribirOfertaPorPrograma(programaId, cb, onError) {
  const q = query(collection(db, "ofertas2027I"), where("programaId", "==", programaId));
  return onSnapshot(
    q,
    (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (a.plan === b.plan ? 0 : a.plan === "Plan anterior" ? -1 : 1) || (a.orden ?? 0) - (b.orden ?? 0));
      cb(lista);
    },
    onError
  );
}

/**
 * Suscribe en tiempo real a la oferta de TODOS los programas. Solo lo permiten las reglas al
 * Director de Departamento (admin); un director de programa que lo intente recibe permission-denied.
 */
export function suscribirOfertaTodas(cb, onError) {
  return onSnapshot(
    collection(db, "ofertas2027I"),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

/**
 * Guarda de una vez los cambios que el director dejó definidos.
 * cambios: { [ofertaId]: { grupos?: null|0..10, estudiantes?: (null|0..50)[], subgrupos?: (null|{nombre,estudiantes}[])[] } }
 * Solo se envían los campos presentes en cada entrada (actualización parcial).
 */
export async function guardarOferta(cambios, correo) {
  const ids = Object.keys(cambios);
  const TAM = 400; // un lote de Firestore admite hasta 500 escrituras
  for (let i = 0; i < ids.length; i += TAM) {
    const lote = writeBatch(db);
    for (const id of ids.slice(i, i + TAM)) {
      lote.update(doc(db, "ofertas2027I", id), {
        ...cambios[id],
        actualizadoPor: correo || "",
        actualizadoEn: serverTimestamp(),
      });
    }
    await lote.commit();
  }
}
