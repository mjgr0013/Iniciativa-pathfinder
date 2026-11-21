# Iniciativa Pathfinder

Aplicación web TypeScript para gestionar iniciativa, rondas y anotaciones temporales o infinitas en encuentros de Pathfinder. Usa Zustand para el estado y guarda el encuentro en `localStorage`.

## Comportamiento

- Incluye por defecto a Gorr, Lyra, Caedren, Kumiko, Adriana y Shary.
- Los turnos respetan iniciativa descendente y orden de inserción en caso de empate.
- Las anotaciones de personajes y globales duran las rondas indicadas; `0` significa que no expiran.
- Las anotaciones globales descuentan rondas al completarse cada vuelta, igual que las de participantes activos.
- Los datos previos se migran conservando el estado y las anotaciones.

## Desarrollo y compilación

Requiere Node.js 20.19+ o 22.12+.

```sh
npm install
npm run dev
npm run build
```

La compilación de producción queda en `dist/`; `npm run preview` permite verificarla localmente.
