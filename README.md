# Iniciativa Pathfinder

Aplicación web estática para gestionar iniciativa, rondas y anotaciones temporales o infinitas en encuentros de Pathfinder.

## Uso

1. Abre `index.html` en un navegador moderno.
2. Añade participantes y asigna su iniciativa.
3. Pulsa **Siguiente participante** para avanzar el turno.
4. Usa las anotaciones para registrar efectos temporales o permanentes.
5. Oculta participantes muertos o retirados sin eliminarlos.
6. Usa **Reiniciar todo** para restaurar Gorr, Lyra, Caedren, Kumiko y Adriana.

Los participantes predeterminados empiezan con iniciativa `0`. Los datos se guardan automáticamente en `localStorage` del navegador.

## Archivos

- `index.html`: estructura de la interfaz.
- `styles.css`: presentación responsive optimizada para PC.
- `app.js`: estado, turnos, rondas, anotaciones y persistencia local.
