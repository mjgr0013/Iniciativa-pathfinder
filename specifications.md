# Especificación: Iniciativa Pathfinder

> **Estado:** borrador inicial para GitHub Spec Kit  
> **Nota:** el repositorio no contiene todavía archivos ni una descripción del producto. Esta propuesta interpreta, a partir del nombre del repositorio, que se desea una herramienta para gestionar la iniciativa de encuentros de Pathfinder. Confirma o ajusta las decisiones marcadas como supuestos antes de implementar.

## Resumen

Crear una aplicación sencilla que permita a un director de juego (DJ) preparar y gestionar el orden de iniciativa durante encuentros de Pathfinder. El DJ podrá añadir personajes y criaturas, ordenar participantes por iniciativa y actualizar el estado del encuentro mientras juega.

## Problema

Durante un encuentro, llevar el orden de los turnos y recordar qué participantes siguen activos puede distraer al DJ del juego. Una herramienta enfocada en iniciativa debería hacer visible quién actúa ahora y quién va después, y permitir actualizar el encuentro con pocas acciones.

## Usuarios

- **Director/a de juego:** crea y controla el encuentro.
- **Jugador/a:** consulta el orden y el estado del encuentro, si la aplicación ofrece una vista compartida.

## Historias de usuario y escenarios

### US1 — Preparar participantes

Como DJ, quiero añadir personajes y criaturas a un encuentro para tener a todos los participantes en una sola lista.

**Escenarios de aceptación:**

- Dado un encuentro, cuando el DJ añade un participante con nombre e iniciativa, entonces aparece en la lista del encuentro.
- El DJ puede distinguir los participantes por su nombre y, opcionalmente, por su tipo (personaje, criatura u otro).
- Si faltan datos obligatorios o son inválidos, la aplicación explica qué debe corregirse y no añade el participante incompleto.

### US2 — Determinar el orden

Como DJ, quiero ordenar a los participantes por su resultado de iniciativa para saber quién actúa primero.

**Escenarios de aceptación:**

- La lista se ordena de mayor a menor iniciativa.
- Si dos o más participantes empatan, el orden entre ellos se resuelve de forma consistente y el DJ puede ajustarlo manualmente.
- El orden actual es claramente visible.

### US3 — Avanzar los turnos

Como DJ, quiero avanzar al siguiente participante y a la siguiente ronda para controlar el progreso del encuentro.

**Escenarios de aceptación:**

- El participante cuyo turno está activo se identifica claramente.
- El DJ puede avanzar al siguiente participante.
- Al terminar una ronda, la aplicación inicia la siguiente y conserva el orden de iniciativa.
- El DJ puede volver a seleccionar un participante si avanza por error.

### US4 — Actualizar el estado de participantes

Como DJ, quiero marcar participantes como activos o fuera de combate para que el orden refleje el estado del encuentro.

**Escenarios de aceptación:**

- El DJ puede cambiar el estado de un participante sin borrarlo del encuentro.
- Los participantes fuera de combate se distinguen visualmente y no reciben el turno activo automáticamente, salvo que el DJ decida lo contrario.

### US5 — Corregir el encuentro

Como DJ, quiero editar o eliminar participantes para corregir errores o reflejar cambios durante la partida.

**Escenarios de aceptación:**

- El DJ puede cambiar el nombre, la iniciativa y el tipo de un participante.
- El DJ puede eliminar un participante, con una confirmación o mecanismo que evite una eliminación accidental.
- Tras una edición, el orden y el turno activo quedan en un estado coherente.

## Requisitos funcionales

- **FR-001:** La aplicación debe permitir crear y gestionar un encuentro.
- **FR-002:** Cada participante debe tener un nombre y un valor de iniciativa.
- **FR-003:** La aplicación debe ordenar participantes de mayor a menor iniciativa.
- **FR-004:** La aplicación debe indicar el participante activo y la ronda actual.
- **FR-005:** El DJ debe poder avanzar el turno y la ronda, y corregir el participante activo.
- **FR-006:** El DJ debe poder editar, retirar y eliminar participantes.
- **FR-007:** La aplicación debe validar los datos de entrada y comunicar errores de forma comprensible.
- **FR-008:** La aplicación debe conservar los cambios durante la sesión de uso. La persistencia entre sesiones queda pendiente de decisión.
- **FR-009:** La gestión del encuentro debe poder usarse sin automatizar reglas de combate que no estén definidas en esta especificación.

## Requisitos no funcionales

- **NFR-001:** Las acciones principales del DJ (añadir participante y avanzar turno) deben ser sencillas de encontrar y ejecutar.
- **NFR-002:** La interfaz debe mantener legibles los nombres, iniciativas, estado y turno activo en tamaños de pantalla habituales.
- **NFR-003:** Los mensajes y controles deben ser comprensibles sin depender exclusivamente del color.
- **NFR-004:** La aplicación no debe presentar como oficiales reglas o cálculos de Pathfinder que no se hayan especificado y verificado.

## Criterios de éxito

- Un DJ puede crear un encuentro y añadir participantes sin instrucciones externas.
- El orden de iniciativa y el turno activo se entienden de un vistazo.
- El DJ puede completar una ronda y corregir un avance accidental sin perder la lista.
- Los errores de validación indican cómo corregir la entrada.

## Entidades principales

- **Encuentro:** conjunto de participantes, ronda actual y posición del turno activo.
- **Participante:** identificador, nombre, iniciativa, tipo opcional y estado.

## Fuera de alcance inicial

- Gestión de hojas de personaje, inventario, hechizos o campañas.
- Cálculo automático de tiradas, modificadores o reglas de combate.
- Sincronización en tiempo real entre varios dispositivos.
- Cuentas, permisos, salas públicas o almacenamiento en la nube.
- Integración con herramientas o servicios externos.

## Supuestos y decisiones pendientes

1. **Sistema y edición:** se asume Pathfinder, pero falta definir si es Pathfinder 1.ª edición, Pathfinder 2.ª edición u otra variante.
2. **Plataforma:** falta decidir si el producto será una aplicación web, móvil, de escritorio o una herramienta de línea de comandos.
3. **Persistencia:** falta decidir si los encuentros solo viven durante una sesión o se guardan para reutilizarse.
4. **Empates:** se asume que el DJ decide o ajusta manualmente el orden de los empates; falta definir si se aplicará alguna regla del sistema elegido.
5. **Vista de jugadores:** la consulta por parte de jugadores es deseable, pero no se presupone que haya colaboración o sincronización.
6. **Idioma:** este documento está en español; falta confirmar los idiomas de la interfaz.

## Preguntas para cerrar el alcance

- ¿Qué edición de Pathfinder debe soportarse?
- ¿Qué plataforma y tecnologías se quieren utilizar?
- ¿Se deben guardar encuentros entre sesiones?
- ¿La aplicación es solo para el DJ o también deben poder verla los jugadores?
- ¿Se necesitan campos como puntos de golpe, condiciones o notas desde la primera versión?

## Preparación para GitHub Spec Kit

Este archivo sirve como especificación inicial de producto. Antes de generar tareas e implementación con Spec Kit, confirma los supuestos y respuestas pendientes. El alcance puede dividirse en especificaciones versionadas de funcionalidades cuando se elija la estructura del proyecto.
