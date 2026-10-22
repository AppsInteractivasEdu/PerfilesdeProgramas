/**
 * Carga inicial de datos en Firebase: crea los 11 usuarios (10 directores +
 * admin) en Authentication, el catálogo de programas y las asignaturas con
 * sus 4 componentes, leyendo data/tabla_resultado.xlsx.
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

const RAIZ = path.resolve(__dirname, "..");
const RUTA_SERVICE_ACCOUNT = path.join(RAIZ, "serviceAccountKey.json");
const RUTA_CREDENCIALES = path.join(__dirname, "credenciales.json");
const RUTA_EXCEL = path.join(RAIZ, "data", "tabla_resultado.xlsx");
const COLUMNAS = { programa: 0, asignatura: 1, pregrado: 2, posgradual: 3, experiencia: 4, competencias: 5 };

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
    nombre: rol === "admin" ? "Administrador" : `Dirección de ${nombrePrograma}`,
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

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function celda(hoja, fila, col) {
  const ref = XLSX.utils.encode_cell({ r: fila, c: col });
  const valor = hoja[ref]?.v;
  return typeof valor === "string" ? valor.trim() : valor ?? "";
}

function construirComponente(valor) {
  return {
    valor: valor || "",
    estadoDirector: "pendiente",
    comentarioDirector: "",
    fechaDirector: null,
    estadoAdmin: "pendiente",
    comentarioAdmin: "",
    fechaAdmin: null,
  };
}

async function cargarAsignaturas() {
  console.log("\n3) Cargando asignaturas desde tabla_resultado.xlsx…");
  console.log(
    "   (el script es seguro de re-ejecutar: una asignatura que ya existe " +
      "solo actualiza su nombre/orden, nunca borra aprobaciones o sugerencias ya guardadas)"
  );
  const libro = XLSX.readFile(RUTA_EXCEL);
  let totalNuevas = 0;
  let totalActualizadas = 0;
  let totalHojas = 0;

  for (const nombreHoja of libro.SheetNames) {
    const hoja = libro.Sheets[nombreHoja];
    const rango = XLSX.utils.decode_range(hoja["!ref"]);
    let nuevasHoja = 0;
    let actualizadasHoja = 0;

    for (let fila = rango.s.r + 1; fila <= rango.e.r; fila++) {
      const nombrePrograma = celda(hoja, fila, COLUMNAS.programa);
      const nombreAsignatura = celda(hoja, fila, COLUMNAS.asignatura);
      if (!nombrePrograma || !nombreAsignatura) continue;

      const credencial = porNombrePrograma.get(nombrePrograma);
      if (!credencial) {
        console.warn(
          `  ⚠ Programa "${nombrePrograma}" (hoja "${nombreHoja}") no está en credenciales.json; se omite esa fila.`
        );
        continue;
      }

      // ID determinístico: re-ejecutar el script no duplica filas.
      const docId = `${credencial.programaId}__${normalizar(nombreAsignatura)}`;
      const ref = db.collection("asignaturas").doc(docId);
      const existente = await ref.get();

      if (existente.exists) {
        await ref.update({
          programaId: credencial.programaId,
          nombrePrograma,
          nombre: nombreAsignatura,
          orden: fila,
        });
        actualizadasHoja++;
      } else {
        await ref.set({
          programaId: credencial.programaId,
          nombrePrograma,
          nombre: nombreAsignatura,
          orden: fila,
          componentes: {
            pregrado: construirComponente(celda(hoja, fila, COLUMNAS.pregrado)),
            posgradual: construirComponente(celda(hoja, fila, COLUMNAS.posgradual)),
            experiencia: construirComponente(celda(hoja, fila, COLUMNAS.experiencia)),
            competencias: construirComponente(celda(hoja, fila, COLUMNAS.competencias)),
          },
        });
        nuevasHoja++;
      }
    }
    console.log(`  ${nombreHoja}: ${nuevasHoja} nuevas, ${actualizadasHoja} ya existían`);
    totalNuevas += nuevasHoja;
    totalActualizadas += actualizadasHoja;
    totalHojas++;
  }
  console.log(
    `  Total: ${totalNuevas} asignaturas nuevas, ${totalActualizadas} existentes actualizadas, en ${totalHojas} hojas.`
  );
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
