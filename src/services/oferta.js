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

/**
 * Todas las asignaturas, de todos los programas, admiten repartir un grupo en subgrupos por
 * docente (Docente 1..5): el director de cada programa decide, asignatura por asignatura y
 * grupo por grupo, si hace falta o no. (Antes esto estaba limitado a Química y a las prácticas
 * finales; ahora el director tiene el control completo sobre cualquier asignatura.)
 *
 * El efecto solo se refleja en el aplicativo de Asignación Docente para las asignaturas que ya
 * pertenecen a alguno de sus tres componentes (Pedagógico, Didáctica de las Disciplinas, Práctica
 * Pedagógica Investigativa): ese aplicativo solo asigna docentes dentro de esos componentes, así
 * que un subgrupo definido aquí para una asignatura de otro componente (fundamentación,
 * disciplinar específico, etc.) queda guardado pero no tiene efecto allá.
 */
export function admiteSubgrupos() {
  return true;
}

/**
 * ¿El texto de "componente" (columna D del formato de necesidades) es uno de los tres
 * componentes propios del Departamento de Pedagogía y Didáctica (Pedagógico, Didáctica de las
 * Disciplinas o Práctica Pedagógica Investigativa, en cualquiera de sus dos planes)? El director de
 * programa solo ve estas en la oferta; las de otros componentes del plan (Fundamentación, Saberes
 * Específicos y Disciplinares, Electivas de Profundización, Segunda Lengua, etc.) no corresponden a
 * este departamento y quedan ocultas.
 * Misma regla de clasificación que usa js/engine.js (clasificar) en el aplicativo de Asignación
 * Docente, simplificada aquí a un sí/no sobre el texto ya guardado en `componente`.
 */
export function esComponenteDPD(componente) {
  const c = String(componente || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  return c.includes("didactica") || c.includes("practica pedagogica") || c === "pedagogico" || c === "componente pedagogico";
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
 * cambios: { [ofertaId]: { grupos?: null|0..10, estudiantes?: (null|0..50)[],
 *   subgrupos?: (null|{mismoDocente, compacto, lista:{nombre,estudiantes}[]})[] } }
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
