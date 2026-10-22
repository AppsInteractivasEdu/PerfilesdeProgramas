# Perfiles Docentes · Departamento de Pedagogía

Aplicativo web para que cada director de programa revise (apruebe o sugiera
cambios) los perfiles docentes de sus asignaturas, y para que el
administrador del Departamento de Pedagogía valide esas sugerencias y
descargue consolidados en PDF y Excel.

- **Frontend:** React + Vite + Tailwind CSS (con modo nocturno)
- **Backend:** Firebase (Authentication + Firestore), plan gratuito Spark
- **Hosting:** GitHub Pages
- **Datos de origen:** `data/tabla_resultado.xlsx` (perfiles docentes de los 10 programas)

## 0. Qué necesitas tener instalado

- [Node.js](https://nodejs.org) 20 o superior (incluye `npm`)
- Una cuenta de Google para crear el proyecto de Firebase

## 1. Instalar dependencias

```bash
npm install
```

## 2. Crear el proyecto de Firebase

1. Entra a [console.firebase.google.com](https://console.firebase.google.com) y crea un proyecto nuevo (gratis, plan Spark).
2. **Authentication** → pestaña "Sign-in method" → habilita **Correo electrónico/contraseña**.
3. **Firestore Database** → "Crear base de datos" → modo producción → elige la región más cercana (p. ej. `us-central` o `southamerica-east1`).
4. **Configuración del proyecto** (ícono de engranaje) → pestaña "General" → sección "Tus apps" → añade una app **Web** (ícono `</>`). Copia el objeto `firebaseConfig` que te muestra.
5. Crea el archivo `.env.local` en la raíz del proyecto (copia `.env.example`) y pega esos valores:

   ```bash
   cp .env.example .env.local
   ```

   Completa las 6 variables con lo que copiaste en el paso 4. **Estos valores no son secretos** — Firebase los expone en el navegador por diseño; la seguridad real la dan las reglas de Firestore (`firestore.rules`).

6. **Configuración del proyecto** → pestaña "Cuentas de servicio" → "Generar nueva clave privada". Se descarga un `.json`: renómbralo a `serviceAccountKey.json` y colócalo en la raíz del proyecto. **Este sí es secreto** — el `.gitignore` ya lo excluye de git, no lo subas a ningún lado.

## 3. Publicar las reglas de seguridad de Firestore

En Firebase Console → Firestore Database → pestaña "Reglas", pega el contenido de [`firestore.rules`](./firestore.rules) y publica. (También puedes hacerlo con la CLI de Firebase si la instalas: `firebase deploy --only firestore:rules`.)

## 4. Cargar los datos iniciales (usuarios + asignaturas)

```bash
npm run seed
```

Esto, usando `scripts/credenciales.json` (ya generado, con los 10 usuarios de directores + 1 de administrador) y `data/tabla_resultado.xlsx`:

- crea los 11 usuarios en Firebase Authentication,
- crea el catálogo de 10 programas en Firestore,
- carga las ~240 asignaturas con sus 4 componentes cada una.

Es seguro volver a ejecutarlo: si una asignatura ya existe, solo actualiza su
nombre/orden y **nunca borra** aprobaciones o sugerencias ya guardadas por un
director o el administrador.

## 5. Probar en local

```bash
npm run dev
```

Abre la URL que te indique (normalmente `http://localhost:5173`) e inicia
sesión con cualquiera de los usuarios de `scripts/credenciales.json`.

## 6. Publicar en GitHub Pages

El repositorio ya incluye un flujo de GitHub Actions
(`.github/workflows/deploy.yml`) que compila y publica automáticamente cada
vez que subes cambios a la rama `main`.

1. En tu repositorio de GitHub: **Settings → Pages → Build and deployment →
   Source** → elige **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret** y
   crea estos 6 secretos con los mismos valores de tu `.env.local`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Sube el proyecto a tu repositorio:

   ```bash
   git init
   git add .
   git commit -m "Aplicativo de perfiles docentes"
   git branch -M main
   git remote add origin <URL-de-tu-repositorio>
   git push -u origin main
   ```

4. En la pestaña **Actions** de GitHub verás el flujo "Publicar en GitHub
   Pages" ejecutándose; cuando termine, la URL pública aparece en
   **Settings → Pages**.

> El `serviceAccountKey.json` y `scripts/credenciales.json` **nunca se suben**
> (están en `.gitignore`): el primero por ser una credencial de
> administrador de Firebase, el segundo por contener las contraseñas de los
> 11 usuarios.

## Las credenciales de acceso

Te las entregué aparte, en un archivo que **no está en este repositorio**
(`scripts/credenciales.json`, y una copia que te envié directamente). Repártelas
de forma segura a cada director de programa y al administrador — idealmente
pidiéndoles que cambien la contraseña la primera vez que entren (Firebase
Authentication permite esto desde la consola o añadiendo esa función más
adelante si la necesitas).

## Cómo funciona

- **Director de programa:** ve solo las asignaturas de su propio programa.
  Por cada asignatura, 4 componentes (Formación de pregrado, Formación
  posgradual, Experiencia docente y profesional, Competencias), cada uno con
  botones **Aprobar** y **Modificar** (este último abre un cuadro de texto
  obligatorio y un botón Guardar). Puede descargar un PDF con únicamente las
  asignaturas que tengan algún componente marcado para modificar.
- **Administrador:** ve, por programa, solo los componentes con solicitud de
  modificación pendiente. Por cada uno: **Aprobar modificación** o
  **Rechazar** (este último exige un comentario). Puede descargar el
  consolidado completo (todos los programas) en PDF y en Excel.
- **Modo nocturno:** botón en la barra superior, se recuerda entre sesiones.

## Estructura del proyecto

```
├── data/tabla_resultado.xlsx   # datos de origen (perfiles docentes)
├── scripts/
│   ├── credenciales.json       # (no en git) usuarios y contraseñas generados
│   └── seed.cjs                 # carga inicial a Firebase
├── src/
│   ├── context/                 # autenticación y tema (modo nocturno)
│   ├── pages/                   # Login, DirectorDashboard, AdminDashboard
│   ├── components/               # piezas de UI reutilizables
│   ├── services/                 # lectura/escritura en Firestore
│   └── utils/                    # exportar PDF/Excel, constantes
└── firestore.rules               # reglas de seguridad
```

## Nota sobre las reglas de seguridad

`firestore.rules` es una base razonable para 11 usuarios conocidos (cada
director solo puede tocar los campos de revisión de su propio programa; el
resto de datos son de solo lectura o de solo administrador). No se sometió a
una auditoría de seguridad independiente — antes de considerarla definitiva,
pruébala en el "Rules Playground" de Firebase Console con distintos
usuarios y escenarios.
