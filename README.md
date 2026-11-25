# Iniciativa Pathfinder

Aplicación web (TypeScript + Vite, sin backend) para gestionar iniciativa, rondas y anotaciones temporales o infinitas en encuentros de Pathfinder. La especificación funcional está en [`specifications.md`](specifications.md).

## Comportamiento

- Incluye por defecto a Gorr, Lyra, Caedren, Kumiko, Adriana y Shary (no se pueden eliminar, solo ocultar).
- Orden por iniciativa descendente; los empates conservan el orden de inserción.
- Las anotaciones (de participante o globales) duran las rondas indicadas; `0` significa infinita.
- Las anotaciones de un participante descuentan una ronda al empezar el turno de ese participante y expiran al llegar a 0. Las globales, al no tener portador, cuentan desde el turno en que se crean.
- El encuentro se guarda en `localStorage`; los datos de versiones anteriores se migran automáticamente.

## Estructura

```
src/
  domain/        Lógica pura del encuentro (sin DOM) y validación de entradas — cubierta por tests
  persistence.ts Carga/guardado en localStorage y migración de esquemas antiguos
  store.ts       Store de Zustand: delega cada acción en el dominio
  ui/            Render y eventos (delegados) del DOM
  main.ts        Punto de entrada
```

## Desarrollo

Requiere Node.js 20.19+ o 22.12+ y Yarn 1.

```sh
yarn install
yarn dev        # servidor de desarrollo
yarn test       # tests unitarios (Vitest)
yarn check      # comprobación de tipos
yarn build      # build de producción en dist/
yarn preview    # sirve el build localmente
```

Cada push a `main` ejecuta tests y build, y publica `dist/` en GitHub Pages.
