# Iniciativa Pathfinder

Aplicación web para gestionar iniciativa, rondas y anotaciones temporales o infinitas en encuentros de Pathfinder. Está implementada en TypeScript con un store de Zustand y se ejecuta en el navegador; el encuentro continúa guardándose en `localStorage`.

## Requisitos

- Node.js 20.19+ o 22.12+

## Desarrollo y compilación

```sh
npm install
npm run dev
```

Para validar los tipos y generar la versión estática de producción:

```sh
npm run build
npm run preview
```

El contenido compilado se genera en `dist/`. La configuración usa rutas relativas para poder publicar también en GitHub Pages.

## Comportamiento

- Los participantes predeterminados son Gorr, Lyra, Caedren, Kumiko y Adriana.
- Los turnos respetan iniciativa descendente y orden de inserción en caso de empate.
- Las anotaciones con duración `0` son infinitas; las de duración positiva descuentan una ronda al terminar la vuelta.
- Se pueden añadir, editar, ocultar, restaurar y eliminar participantes, así como gestionar anotaciones.
- La acción de reinicio solicita confirmación y restaura el encuentro predeterminado.
- El estado existente guardado en `localStorage` se mantiene compatible, incluidas las anotaciones creadas con el antiguo checkbox de duración infinita.

## Estructura

- `src/types.ts`: modelos TypeScript.
- `src/store.ts`: estado y acciones de encuentro en Zustand, con persistencia compatible en `localStorage`.
- `src/main.ts`: interfaz del navegador y conexión con el store.
- `index.html` y `styles.css`: estructura y estilos.
