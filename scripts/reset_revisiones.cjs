// Resetea TODOS los estados de revisión (de director, departamento y decano);
// conserva los textos (valor).
const admin = require("firebase-admin");
const key = require("../serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const ESTADO_PENDIENTE = "pendiente";

function revisionEnBlanco() {
  return {
    estado: ESTADO_PENDIENTE,
    comentario: "",
    fecha: null,
    estadoAdmin: ESTADO_PENDIENTE,
    comentarioAdmin: "",
    fechaAdmin: null,
    historial: [],
  };
}

async function main() {
  const snap = await db.collection("asignaturas").get();
  const batch = db.batch();
  let count = 0;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const componentes = data.componentes || {};
    const updates = {};

    for (const clave of Object.keys(componentes)) {
      const revisores = Object.keys(componentes[clave]?.revisiones || {});
      for (const revisor of revisores) {
        updates[`componentes.${clave}.revisiones.${revisor}`] = revisionEnBlanco();
      }
      updates[`componentes.${clave}.textoActualizado`] = false;
      updates[`componentes.${clave}.fechaEdicion`] = null;
    }

    batch.update(docSnap.ref, updates);
    count++;
  });

  await batch.commit();
  console.log(`Reset completo: ${count} asignaturas reiniciadas.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
