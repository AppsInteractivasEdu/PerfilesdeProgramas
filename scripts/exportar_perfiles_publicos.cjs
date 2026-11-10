// Genera/actualiza perfilesPublicos/{asignaturaId}: un espejo de SOLO el
// texto final de cada asignatura (sin comentarios de revisión, estados de
// aprobación ni historial), para que el micrositio externo lo lea
// directamente en vez de que alguien suba a mano el PDF que antes se
// descargaba desde este aplicativo.
//
// Correr una vez para la carga inicial (incluye TODAS las asignaturas, ya
// hayan sido editadas o no por el Director de Departamento). Puede volver a
// correrse en cualquier momento sin riesgo: siempre deja perfilesPublicos
// igual al texto actual de "asignaturas". Las ediciones normales de texto
// (ComponenteEditorAdmin) ya se reflejan solas después de esto, ver
// editarTextoComponente en src/services/asignaturas.js.
const admin = require("firebase-admin");
const key = require("../serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const FIJOS = [
  { clave: "pregrado", etiqueta: "Formación de pregrado" },
  { clave: "posgradual", etiqueta: "Formación posgradual" },
  { clave: "experiencia", etiqueta: "Experiencia docente y profesional" },
];
const CLAVE_IDONEIDAD = "idoneidad";
const ETIQUETA_IDONEIDAD = "Criterio integral de idoneidad";
const esCompetencia = (clave) => /^comp\d+$/.test(clave);

function partirCompetencia(valor = "") {
  const i = valor.indexOf("\n");
  if (i === -1) return [valor.trim(), ""];
  return [valor.slice(0, i).trim(), valor.slice(i + 1).trim()];
}

/** Misma lógica que listarComponentes() en src/utils/constantes.js. */
function listarComponentesPublicos(componentes = {}) {
  const lista = FIJOS.map((f) => ({ ...f, tipo: "fijo" }));
  Object.keys(componentes)
    .filter(esCompetencia)
    .sort((a, b) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10))
    .forEach((clave) => {
      const [nombre] = partirCompetencia(componentes[clave]?.valor);
      lista.push({ clave, etiqueta: nombre || `Competencia ${clave.slice(4)}`, tipo: "competencia" });
    });
  if (componentes[CLAVE_IDONEIDAD]) {
    lista.push({ clave: CLAVE_IDONEIDAD, etiqueta: ETIQUETA_IDONEIDAD, tipo: "idoneidad" });
  }
  return lista;
}

async function main() {
  const snap = await db.collection("asignaturas").get();
  const filas = snap.docs;
  console.log(`Encontradas ${filas.length} asignaturas. Escribiendo perfilesPublicos…`);

  const TAMANO_LOTE = 400; // margen bajo el límite de 500 escrituras/lote de Firestore
  for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
    const lote = db.batch();
    for (const docSnap of filas.slice(i, i + TAMANO_LOTE)) {
      const a = docSnap.data();
      const componentesPublicos = {};
      for (const { clave, etiqueta, tipo } of listarComponentesPublicos(a.componentes)) {
        componentesPublicos[clave] = { etiqueta, tipo, valor: a.componentes?.[clave]?.valor || "" };
      }
      lote.set(db.collection("perfilesPublicos").doc(docSnap.id), {
        nombre: a.nombre,
        orden: a.orden ?? 0,
        programaId: a.programaId,
        nombrePrograma: a.nombrePrograma,
        departamentoId: a.departamentoId || null,
        nombreDepartamento: a.nombreDepartamento || null,
        componentes: componentesPublicos,
      });
    }
    await lote.commit();
    console.log(`  ✔ Lote ${Math.floor(i / TAMANO_LOTE) + 1} (${Math.min(i + TAMANO_LOTE, filas.length)}/${filas.length})`);
  }

  console.log(`\n✔ perfilesPublicos actualizado: ${filas.length} asignaturas.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
