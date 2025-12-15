# Salón de Belleza Divas AyA

Este es un proyecto de aplicación web para el salón de belleza "Divas AyA", construido con Next.js, React, Firebase y Genkit para funcionalidades de IA. La aplicación permite la gestión de citas, servicios, estilistas y una galería de imágenes a través de un panel de administración, y ofrece a los clientes una interfaz pública para ver información y agendar citas.

## Tecnologías Utilizadas

- **Framework**: [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/)
- **Componentes UI**: [shadcn/ui](https://ui.shadcn.com/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend y Base de Datos**: [Firebase](https://firebase.google.com/) (Authentication y Firestore)
- **Funcionalidades de IA**: [Genkit (Google AI)](https://firebase.google.com/docs/genkit)

## Cómo Empezar

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno de desarrollo local.

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- [npm](https://www.npmjs.com/) (o un gestor de paquetes compatible como `yarn` o `pnpm`)

### 1. Instalación de Dependencias

Una vez que tengas el código en tu máquina local, abre una terminal en el directorio raíz del proyecto y ejecuta el siguiente comando para instalar todas las librerías necesarias:

```bash
npm install
```

### 2. Configuración del Entorno (Firebase)

Esta aplicación utiliza Firebase para la autenticación y la base de datos. Para que funcione localmente, necesitas conectar tu propia configuración de Firebase.

1.  **Crea un proyecto en Firebase**: Ve a la [consola de Firebase](https://console.firebase.google.com/) y crea un nuevo proyecto.
2.  **Activa Authentication y Firestore**:
    *   En el menú de tu proyecto de Firebase, ve a la sección **Authentication**, haz clic en "Get Started" y activa el proveedor **Email/Password**.
    *   Ve a la sección **Firestore Database**, haz clic en "Create database" y configúrala en modo de producción.
3.  **Obtén tu configuración de Firebase**:
    *   En la configuración de tu proyecto (`Project settings`), ve a la sección "General".
    *   En "Your apps", crea una nueva "Web app".
    *   Firebase te proporcionará un objeto de configuración (`firebaseConfig`).
4.  **Actualiza el archivo de configuración**:
    *   Abre el archivo `src/firebase/config.ts`.
    *   Reemplaza el contenido existente con el objeto `firebaseConfig` que obtuviste de tu proyecto.

### 3. Ejecutar el Servidor de Desarrollo

Con las dependencias instaladas y la configuración de Firebase lista, puedes iniciar el servidor de desarrollo local:

```bash
npm run dev
```

Esto iniciará la aplicación en modo de desarrollo, generalmente en `http://localhost:9002`. Puedes visitar esta URL en tu navegador para ver la aplicación en funcionamiento.

### 4. Primer Inicio de Sesión (Creación del Admin)

La primera vez que inicies sesión, la aplicación creará automáticamente una cuenta de administrador con las credenciales que uses.

-   Ve a la página de login (normalmente en `/login`).
-   Usa un correo y una contraseña (por ejemplo, `admin@divas.com` y una contraseña segura de al menos 8 caracteres).
-   El sistema intentará iniciar sesión. Al no encontrar el usuario, lo creará y luego te redirigirá al panel de administración.

## Scripts Disponibles

En el archivo `package.json`, encontrarás varios scripts útiles:

-   `npm run dev`: Inicia el servidor de desarrollo de Next.js.
-   `npm run build`: Compila la aplicación para producción.
-   `npm run start`: Inicia un servidor de producción después de compilar (`build`).
-   `npm run lint`: Ejecuta el linter de código para encontrar problemas.
-   `npm run typecheck`: Revisa los tipos de TypeScript sin compilar.
