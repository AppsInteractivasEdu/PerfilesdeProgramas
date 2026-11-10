/**
 * Carga en Firestore (colección `ofertas2027I`) las asignaturas sobre las que cada director de
 * programa define cuántos grupos se ofertarán en 2027-I, a partir del archivo
 * FORMATO_DE_NECESIDADES_2027-I_COMPONENTES_DPD.xlsx (una hoja por programa; en cada hoja, dos
 * bloques encabezados por su ACUERDO ACADÉMICO: el primero es el del plan anterior y el segundo el
 * del plan de transición).
 *
 * Se puede volver a correr cuando se quiera: solo crea las asignaturas que falten y actualiza sus
 * datos descriptivos (acuerdo, créditos, componente, orden). NUNCA toca `grupos`, así que no borra
 * lo que los directores ya hayan decidido.
 *
 * Requiere serviceAccountKey.json en la raíz del proyecto (igual que `npm run seed`).
 *
 * Uso:  node scripts/seed_oferta.cjs [ruta-al-excel]
 *       (por defecto: ../docentesAsignacion/FORMATO_DE_NECESIDADES_2027-I_COMPONENTES_DPD.xlsx)
 *       node scripts/seed_oferta.cjs --simular     (solo muestra lo que haría, sin escribir)
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const RAIZ = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const SIMULAR = args.includes("--simular");
const RUTA_EXCEL = path.resolve(
  args.find((a) => !a.startsWith("--")) ||
    path.join(RAIZ, "..", "docentesAsignacion", "FORMATO_DE_NECESIDADES_2027-I_COMPONENTES_DPD.xlsx")
);

// Programa (como figura en el Excel, sin tildes ni mayúsculas) -> id del programa en este aplicativo
const PROGRAMAS = {
  "licenciatura en etnoeducacion": ["etnoeducacion", "Licenciatura en Etnoeducación"],
  "licenciatura en matematicas": ["matematicas", "Licenciatura en Matemáticas"],
  "licenciatura en quimica": ["quimica", "Licenciatura en Química"],
  "licenciatura en ciencias naturales y educacion ambiental": ["ciencias-naturales", "Licenciatura en Ciencias Naturales y Educación Ambiental"],
  "licenciatura en artes": ["artes", "Licenciatura en Artes"],
  "licenciatura en educacion campesina y rural": ["educacion-campesina-rural", "Licenciatura en Educación Campesina y Rural"],
  "licenciatura en educacion infantil": ["educacion-infantil", "Licenciatura en Educación Infantil"],
  "licenciatura en lenguas extranjeras con enfasis en ingles": ["lenguas-extranjeras", "Licenciatura en Lenguas Extranjeras con Énfasis en Inglés"],
  "licenciatura en tecnologia": ["tecnologia", "Licenciatura en Tecnología"],
  "licenciatura en literatura y lengua castellana": ["literatura-lengua-castellana", "Licenciatura en Literatura y Lengua Castellana"],
};

const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const clavePrograma = (s) => sinTildes(s).toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
const slug = (s) => clavePrograma(s).replace(/ /g, "-");

function salirConError(mensaje) {
  console.error(`\n✖ ${mensaje}\n`);
  process.exit(1);
}

function leerFilas() {
  if (!fs.existsSync(RUTA_EXCEL)) salirConError(`No encuentro el Excel: ${RUTA_EXCEL}`);
  const wb = XLSX.readFile(RUTA_EXCEL);
  const filas = [];
  const vistos = new Set();
  for (const hoja of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: "", raw: false });
    let acuerdo = null, plan = null, bloque = 0, orden = 0;
    rows.forEach((r, i) => {
      const c = r.map((x) => String(x).trim());
      const llenas = c.filter(Boolean);
      if (!llenas.length) return;
      if (/^ACUERDO ACAD/i.test(c[0]) && llenas.length === 1) {
        acuerdo = c[0].replace(/\s+/g, " ").replace(/N°\s*(\d)/, "N° $1");
        bloque++;
        if (bloque > 2) salirConError(`Hoja "${hoja}", fila ${i + 1}: hay más de dos acuerdos (${acuerdo}).`);
        plan = bloque === 1 ? "Plan anterior" : "Plan de transición";
        return;
      }
      if (/^nombre del programa/i.test(c[0])) return;
      if (!acuerdo) salirConError(`Hoja "${hoja}", fila ${i + 1}: hay datos antes del encabezado del acuerdo.`);
      const [programa, asignatura, creditos, componente] = c;
      const p = PROGRAMAS[clavePrograma(programa)];
      if (!p) salirConError(`Hoja "${hoja}", fila ${i + 1}: programa no reconocido «${programa}».`);
      const id = `${p[0]}__${plan === "Plan anterior" ? "anterior" : "transicion"}__${slug(asignatura)}`;
      if (vistos.has(id)) salirConError(`Asignatura repetida en el mismo acuerdo: ${id}`);
      vistos.add(id);
      orden++;
      filas.push({
        id, programaId: p[0], nombrePrograma: p[1], acuerdo, plan,
        asignatura, creditos: Number(creditos), componente, orden,
      });
    });
  }
  return filas;
}

async function main() {
  const filas = leerFilas();
  const porPrograma = {};
  filas.forEach((f) => { porPrograma[f.nombrePrograma] = (porPrograma[f.nombrePrograma] || 0) + 1; });
  console.log(`Leídas ${filas.length} asignaturas de ${RUTA_EXCEL}`);
  Object.entries(porPrograma).forEach(([p, n]) => console.log(`  ${p}: ${n}`));
  if (SIMULAR) { console.log("\n(simulación: no se escribió nada)"); return; }

  const RUTA_KEY = path.join(RAIZ, "serviceAccountKey.json");
  if (!fs.existsSync(RUTA_KEY)) salirConError("Falta serviceAccountKey.json en la raíz del proyecto (ver `npm run seed`).");
  const admin = require("firebase-admin");
  admin.initializeApp({ credential: admin.credential.cert(require(RUTA_KEY)) });
  const db = admin.firestore();
  const col = db.collection("ofertas2027I");

  let nuevas = 0, actualizadas = 0;
  const TAM = 400;
  for (let i = 0; i < filas.length; i += TAM) {
    const lote = filas.slice(i, i + TAM);
    const refs = lote.map((f) => col.doc(f.id));
    const snaps = await db.getAll(...refs);
    const batch = db.batch();
    lote.forEach((f, k) => {
      const { id, ...datos } = f;
      if (snaps[k].exists) { batch.update(refs[k], datos); actualizadas++; }
      else { batch.set(refs[k], { ...datos, grupos: null, actualizadoPor: "", actualizadoEn: null }); nuevas++; }
    });
    await batch.commit();
  }
  console.log(`\n✔ Oferta 2027-I lista: ${nuevas} asignaturas nuevas, ${actualizadas} ya existían (se conservaron sus grupos).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
