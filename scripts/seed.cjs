/**
 * Carga inicial de datos en Firebase: crea los usuarios (directores + admin)
 * en Authentication, el catálogo de programas y las asignaturas con todos sus
 * componentes (pregrado, posgradual, experiencia, competencias 1..N e
 * idoneidad), leyendo data/tabla_resultado.xlsx.
 *
 * Requiere, en la raíz del proyecto:
 *   - serviceAccountKey.json  (Firebase Console > Configuración del proyecto
 *     > Cuentas de servicio > Generar nueva clave privada). NUNCA se sube a git.
 *
 * Uso:  npm run seed
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const XLSX = require("xlsx");
const { leerAsignaturas, componenteNuevo, normalizarTexto } = require("./lib_excel.cjs");

const RAIZ = path.resolve(__dirname, "..");
const RUTA_SERVICE_ACCOUNT = path.join(RAIZ, "serviceAccountKey.json");
const RUTA_CREDENCIALES = path.join(__dirname, "credenciales.json");
const RUTA_EXCEL = path.join(RAIZ, "data", "tabla_resultado.xlsx");

function salirConError(mensaje) {
  console.error(`\n✖ ${mensaje}\n`);
  process.exit(1);
}

if (!fs.existsSync(RUTA_SERVICE_ACCOUNT)) {
  salirConError(
    "Falta serviceAccountKey.json en la raíz del proyecto.\n" +
      "  Descárgalo desde Firebase Console > Configuración del proyecto > " +
      "Cuentas de servicio > Generar nueva clave privada, y guárdalo con ese nombre."
  );
}
if (!fs.existsSync(RUTA_CREDENCIALES)) {
  salirConError("Falta scripts/credenciales.json (debería existir; no lo borres).");
}
if (!fs.existsSync(RUTA_EXCEL)) {
  salirConError(`Falta ${RUTA_EXCEL}`);
}

admin.initializeApp({
  credential: admin.credential.cert(require(RUTA_SERVICE_ACCOUNT)),
});
const auth = admin.auth();
const db = admin.firestore();

const credenciales = JSON.parse(fs.readFileSync(RUTA_CREDENCIALES, "utf-8"));
const porNombrePrograma = new Map(
  credenciales.filter((c) => c.rol === "director").map((c) => [c.nombrePrograma, c])
);

async function crearOActualizarUsuario({ email, password, rol, programaId, nombrePrograma }) {
  let uid;
  try {
    const existente = await auth.getUserByEmail(email);
    uid = existente.uid;
    await auth.updateUser(uid, { password });
    console.log(`  usuario existente actualizado: ${email}`);
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    const nuevo = await auth.createUser({ email, password });
    uid = nuevo.uid;
    console.log(`  usuario creado: ${email}`);
  }
  await db.collection("usuarios").doc(uid).set({
    rol,
    programaId: programaId || null,
    nombrePrograma: nombrePrograma || null,
    nombre: rol === "admin" ? "Director de Departamento" : `Dirección de ${nombrePrograma}`,
  });
}

async function crearUsuarios() {
  console.log("\n1) Creando usuarios en Firebase Authentication…");
  for (const c of credenciales) {
    await crearOActualizarUsuario(c);
  }
}

async function crearProgramas() {
  console.log("\n2) Creando catálogo de programas…");
  const lote = db.batch();
  for (const c of credenciales.filter((c) => c.rol === "director")) {
    const ref = db.collection("programas").doc(c.programaId);
    lote.set(ref, { nombre: c.nombrePrograma });
  }
  await lote.commit();
  console.log(`  ${porNombrePrograma.size} programas.`);
}

async function cargarAsignaturas() {
  console.log("\n3) Cargando asignaturas desde tabla_resultado.xlsx…");
  console.log(
    "   (seguro de re-ejecutar: una asignatura que ya existe solo actualiza " +
      "nombre/orden; para actualizar textos usa scripts/sincronizar_textos.cjs)"
  );
  let nuevas = 0;
  let existentes = 0;

  for (const f of leerAsignaturas(XLSX.readFile(RUTA_EXCEL))) {
    const credencial = porNombrePrograma.get(f.nombrePrograma);
    if (!credencial) {
      console.warn(`  ⚠ Programa "${f.nombrePrograma}" (hoja "${f.nombreHoja}") no está en credenciales.json; se omite.`);
      continue;
    }
    const docId = `${credencial.programaId}__${normalizarTexto(f.nombreAsignatura)}`;
    const ref = db.collection("asignaturas").doc(docId);
    const datosBase = {
      programaId: credencial.programaId,
      nombrePrograma: f.nombrePrograma,
      nombre: f.nombreAsignatura,
      orden: f.fila,
    };
    if ((await ref.get()).exists) {
      await ref.update(datosBase);
      existentes++;
    } else {
      const componentes = {};
      for (const [clave, valor] of Object.entries(f.componentes)) {
        componentes[clave] = componenteNuevo(valor);
      }
      await ref.set({ ...datosBase, componentes });
      nuevas++;
    }
  }
  console.log(`  Total: ${nuevas} asignaturas nuevas, ${existentes} ya existían.`);
}

async function main() {
  await crearUsuarios();
  await crearProgramas();
  await cargarAsignaturas();
  console.log("\n✔ Carga completa.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
