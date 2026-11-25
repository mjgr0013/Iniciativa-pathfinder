# Iniciativa Pathfinder

Aplicación web (TypeScript + Vite, sin backend) para gestionar iniciativa, rondas y anotaciones temporales o infinitas en encuentros de Pathfinder. La especificación funcional, con ejemplos de duración de anotaciones, está en [`specifications.md`](specifications.md).

## Comportamiento

- Incluye por defecto a Gorr, Lyra, Caedren, Kumiko, Adriana y Shary, con su retrato (no se pueden eliminar, solo ocultar). Los participantes añadidos muestran sus iniciales.
- Orden por iniciativa descendente; los empates conservan el orden de inserción. La lista se muestra rotada desde el turno actual, con un separador donde empieza la siguiente ronda.
- «Siguiente turno» avanza; para dar el turno a otro participante a mano: doble clic (o pulsación larga en móvil) y confirmar.
- Nombre e iniciativa se editan en línea pulsando sobre ellos.
- Ocultar o eliminar al participante actual cuenta como terminar su turno.
- Las anotaciones (de participante o globales) duran las rondas indicadas; `0` significa infinita.
- Toda anotación (de participante o global) la desencadena quien tiene el turno al añadirla: descuenta una ronda cada vez que vuelve su turno y expira al llegar a 0. Las finitas muestran «hasta [token]» con el retrato o las iniciales de ese participante.
- El encuentro se guarda en `localStorage`; los datos de versiones anteriores se migran automáticamente.

## Estructura

```
src/
  domain/          Lógica pura del encuentro (sin DOM): turnos, rondas, duración de anotaciones
                   y validación de entradas — cubierta por tests
  persistence.ts   Carga/guardado en localStorage y migración de esquemas antiguos
  store.ts         Store de Zustand: delega cada acción en el dominio
  ui/              Render y eventos (delegados) del DOM: tarjetas, anotaciones, edición en línea,
                   diálogo de confirmación, tokens (retratos e iniciales)
  assets/tokens/   Retratos de los participantes predeterminados (256 px)
  styles.css       Estilos
  main.ts          Punto de entrada
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
