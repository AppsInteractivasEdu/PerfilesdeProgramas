/**
 * Sincroniza en Firestore el contenido de data/tabla_resultado.xlsx:
 *  - componentes que ya existen: solo actualiza el texto (valor);
 *    conserva estados de aprobación y comentarios.
 *  - componentes que no existen (p. ej. comp1..compN, idoneidad): los crea en "pendiente".
 * No borra nada (el campo antiguo "competencias" se deja intacto).
 *
 * Uso:  node scripts/sincronizar_textos.cjs
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const XLSX = require("xlsx");
const { leerAsignaturas, componenteNuevo, normalizarTexto } = require("./lib_excel.cjs");

const RAIZ = path.resolve(__dirname, "..");
admin.initializeApp({ credential: admin.credential.cert(require(path.join(RAIZ, "serviceAccountKey.json"))) });
const db = admin.firestore();

const credenciales = JSON.parse(fs.readFileSync(path.join(__dirname, "credenciales.json"), "utf-8"));
const porNombrePrograma = new Map(
  credenciales.filter((c) => c.rol === "director").map((c) => [c.nombrePrograma, c])
);

async function main() {
  const filas = leerAsignaturas(XLSX.readFile(path.join(RAIZ, "data", "tabla_resultado.xlsx")));
  console.log(`Filas leídas del Excel: ${filas.length}`);

  let lote = db.batch();
  let enLote = 0;
  const cuenta = { docsActualizados: 0, valoresActualizados: 0, componentesCreados: 0, sinCambio: 0, noExisten: 0 };

  for (const f of filas) {
    const credencial = porNombrePrograma.get(f.nombrePrograma);
    if (!credencial) {
      console.warn(`⚠ Programa sin credencial: ${f.nombrePrograma}`);
      continue;
    }
    const docId = `${credencial.programaId}__${normalizarTexto(f.nombreAsignatura)}`;
    const ref = db.collection("asignaturas").doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.warn(`⚠ No existe en Firestore: ${docId}`);
      cuenta.noExisten++;
      continue;
    }
    const actuales = snap.data().componentes || {};
    const cambios = {};
    for (const [clave, valor] of Object.entries(f.componentes)) {
      if (!actuales[clave]) {
        cambios[`componentes.${clave}`] = componenteNuevo(valor);
        cuenta.componentesCreados++;
      } else if ((actuales[clave].valor ?? "") !== valor) {
        cambios[`componentes.${clave}.valor`] = valor;
        cuenta.valoresActualizados++;
      }
    }
    if (Object.keys(cambios).length === 0) {
      cuenta.sinCambio++;
      continue;
    }
    lote.update(ref, cambios);
    cuenta.docsActualizados++;
    if (++enLote === 400) {
      await lote.commit();
      lote = db.batch();
      enLote = 0;
    }
  }
  if (enLote > 0) await lote.commit();
  console.log(cuenta);

  // Verificación: todo componente del Excel existe en Firestore con el mismo texto.
  let difieren = 0;
  for (const f of filas) {
    const docId = `${porNombrePrograma.get(f.nombrePrograma).programaId}__${normalizarTexto(f.nombreAsignatura)}`;
    const comp = (await db.collection("asignaturas").doc(docId).get()).data()?.componentes || {};
    for (const [clave, valor] of Object.entries(f.componentes)) {
      if ((comp[clave]?.valor ?? null) !== valor) difieren++;
    }
  }
  console.log(`Verificación final: ${difieren} componentes difieren del Excel (esperado: 0).`);
  process.exit(difieren === 0 && cuenta.noExisten === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
