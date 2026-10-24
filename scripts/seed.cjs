/**
 * Carga inicial de datos en Firebase: crea los usuarios (directores de
 * programa, departamentos, decano y admin) en Authentication, los catálogos
 * de programas y departamentos, y las asignaturas con todos sus componentes
 * (pregrado, posgradual, experiencia, competencias 1..N e idoneidad),
 * leyendo data/tabla_resultado.xlsx. Cada componente lleva una revisión en
 * blanco por cada revisor aplicable (director de programa, departamento si
 * la asignatura tiene uno asignado, y decano).
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
const { leerAsignaturas, componenteNuevo, migrarComponenteAntiguo, normalizarTexto } = require("./lib_excel.cjs");
const { DEPARTAMENTOS, construirMapaAsignacion } = require("./datos_departamentos.cjs");

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
  salirConError("Falta scripts/credenciales.json (debería existir; no lo borres). Genéralo con: node scripts/generar_credenciales.cjs");
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
const mapaAsignacionDepartamento = construirMapaAsignacion();

async function crearOActualizarUsuario(c) {
  const { email, password, rol } = c;
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

  let datos;
  if (rol === "director") {
    datos = {
      rol,
      programaId: c.programaId,
      nombrePrograma: c.nombrePrograma,
      departamentoId: null,
      nombreDepartamento: null,
      nombre: `Dirección de ${c.nombrePrograma}`,
    };
  } else if (rol === "departamento") {
    datos = {
      rol,
      programaId: null,
      nombrePrograma: null,
      departamentoId: c.departamentoId,
      nombreDepartamento: c.nombreDepartamento,
      nombre: c.nombreDepartamento,
    };
  } else if (rol === "decano") {
    datos = {
      rol,
      programaId: null,
      nombrePrograma: null,
      departamentoId: null,
      nombreDepartamento: null,
      nombre: "Decano de la Facultad de Educación",
    };
  } else {
    // admin
    datos = {
      rol,
      programaId: null,
      nombrePrograma: null,
      departamentoId: null,
      nombreDepartamento: null,
      nombre: "Director de Departamento",
    };
  }
  await db.collection("usuarios").doc(uid).set(datos);
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

async function crearDepartamentos() {
  console.log("\n3) Creando catálogo de departamentos…");
  const lote = db.batch();
  for (const d of DEPARTAMENTOS) {
    const ref = db.collection("departamentos").doc(d.departamentoId);
    lote.set(ref, { nombre: d.nombre });
  }
  await lote.commit();
  console.log(`  ${DEPARTAMENTOS.length} departamentos.`);
}

async function cargarAsignaturas() {
  console.log("\n4) Cargando asignaturas desde tabla_resultado.xlsx…");
  console.log(
    "   (seguro de re-ejecutar: una asignatura que ya existe solo actualiza " +
      "nombre/orden/departamento; para actualizar textos usa scripts/sincronizar_textos.cjs)"
  );
  let nuevas = 0;
  let existentes = 0;
  let componentesMigrados = 0;
  let componentesCreados = 0;
  let departamentosAsignados = 0;

  for (const f of leerAsignaturas(XLSX.readFile(RUTA_EXCEL))) {
    const credencial = porNombrePrograma.get(f.nombrePrograma);
    if (!credencial) {
      console.warn(`  ⚠ Programa "${f.nombrePrograma}" (hoja "${f.nombreHoja}") no está en credenciales.json; se omite.`);
      continue;
    }
    const docId = `${credencial.programaId}__${normalizarTexto(f.nombreAsignatura)}`;
    const asignacion = mapaAsignacionDepartamento.get(docId) || null;
    const conDepartamento = Boolean(asignacion);

    const ref = db.collection("asignaturas").doc(docId);
    const datosBase = {
      programaId: credencial.programaId,
      nombrePrograma: f.nombrePrograma,
      nombre: f.nombreAsignatura,
      orden: f.fila,
      departamentoId: asignacion ? asignacion.departamentoId : null,
      nombreDepartamento: asignacion ? asignacion.nombreDepartamento : null,
    };

    const snap = await ref.get();
    if (!snap.exists) {
      const componentes = {};
      for (const [clave, valor] of Object.entries(f.componentes)) {
        componentes[clave] = componenteNuevo(valor, { conDepartamento });
      }
      await ref.set({ ...datosBase, componentes });
      nuevas++;
      if (conDepartamento) departamentosAsignados++;
      continue;
    }

    existentes++;
    const actual = snap.data();
    const cambios = { ...datosBase };
    const actualesComponentes = actual.componentes || {};
    if (conDepartamento && actual.departamentoId !== asignacion.departamentoId) departamentosAsignados++;

    for (const [clave, valor] of Object.entries(f.componentes)) {
      const existente = actualesComponentes[clave];
      if (!existente) {
        cambios[`componentes.${clave}`] = componenteNuevo(valor, { conDepartamento });
        componentesCreados++;
      } else if (!existente.revisiones) {
        // esquema antiguo (previo a directores+departamento+decano): migrar conservando el estado.
        cambios[`componentes.${clave}`] = migrarComponenteAntiguo(existente, { conDepartamento });
        componentesMigrados++;
      } else if (conDepartamento && !existente.revisiones.departamento) {
        // la asignatura pasó a tener departamento asignado: se añade su revisión en blanco.
        cambios[`componentes.${clave}.revisiones.departamento`] = {
          estado: "pendiente",
          comentario: "",
          fecha: null,
          estadoAdmin: "pendiente",
          comentarioAdmin: "",
          fechaAdmin: null,
          historial: [],
        };
      }
    }
    await ref.update(cambios);
  }
  console.log(
    `  Total: ${nuevas} asignaturas nuevas, ${existentes} ya existían, ` +
      `${componentesCreados} componentes creados, ${componentesMigrados} componentes migrados al esquema nuevo, ` +
      `${departamentosAsignados} asignaturas con departamento asignado.`
  );
}

async function main() {
  await crearUsuarios();
  await crearProgramas();
  await crearDepartamentos();
  await cargarAsignaturas();
  console.log("\n✔ Carga completa.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
