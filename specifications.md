# Especificación: Iniciativa Pathfinder

> **Estado:** especificación inicial para GitHub Spec Kit  
> **Idioma de la interfaz:** español  
> **Plataforma:** aplicación web de frontend; toda la lógica se implementará en JavaScript, sin backend.

## Resumen

Aplicación web para que un director de juego gestione el orden de iniciativa durante un encuentro de Pathfinder. Permite añadir participantes con un valor numérico de iniciativa, verlos ordenados, avanzar al participante actual con un botón, llevar el contador de rondas, gestionar anotaciones temporales o permanentes y ocultar participantes que hayan muerto sin eliminarlos del encuentro.

## Problema

Durante un encuentro, el director de juego necesita consultar rápidamente quién actúa ahora, quién sigue, en qué ronda está el combate y qué anotaciones siguen vigentes para cada participante. La aplicación debe facilitar ese seguimiento desde un ordenador, con una interfaz clara y acciones principales accesibles.

## Usuario principal

- **Director/a de juego:** añade participantes y anotaciones, controla el avance de los turnos y las rondas, y oculta o restaura participantes.

## Historias de usuario y escenarios

### US1 — Añadir participantes

Como director/a de juego, quiero añadir participantes con su nombre y su número de iniciativa para preparar el orden de actuación.

**Escenarios de aceptación:**

- Al añadir un participante con nombre e iniciativa válidos, aparece en la lista.
- La iniciativa se acepta y valida como número.
- La lista se ordena automáticamente de mayor a menor iniciativa; el valor más alto actúa primero.
- Si hay empate, se conserva el orden en que se añadieron los participantes empatados.
- La aplicación informa de forma clara si falta el nombre o la iniciativa no es válida.

### US2 — Avanzar al siguiente participante

Como director/a de juego, quiero avanzar con un botón para actualizar quién es el participante actual.

**Escenarios de aceptación:**

- El primer participante visible de la lista activa es siempre el actual y se destaca visualmente.
- Al pulsar el botón de avanzar, el siguiente participante de la lista activa pasa a ser el actual.
- Al avanzar desde el último participante activo, el turno vuelve al primero y comienza una nueva ronda.
- Si no hay participantes activos, el botón no avanza el turno ni incrementa la ronda.

### US3 — Consultar el contador de rondas

Como director/a de juego, quiero ver la ronda actual para saber cuánto ha avanzado el encuentro.

**Escenarios de aceptación:**

- El contador comienza en la ronda 1 cuando empieza el seguimiento del encuentro.
- La ronda aumenta en uno cuando todos los participantes activos han actuado y el turno vuelve al primero.
- El número de ronda actual está visible en la interfaz.

### US4 — Añadir y gestionar anotaciones

Como director/a de juego, quiero añadir anotaciones a cada participante con una duración en rondas o permanente para recordar efectos o información relevante.

**Escenarios de aceptación:**

- Cada participante puede tener cero o más anotaciones.
- Una anotación incluye un texto y una duración: un número de rondas o duración infinita.
- Las anotaciones con duración finita muestran cuántas rondas les quedan.
- Al completarse una ronda, las anotaciones finitas de los participantes activos reducen su duración restante en una ronda.
- Una anotación finita se elimina automáticamente cuando su duración llega a cero.
- Una anotación infinita permanece hasta que el director de juego la quite manualmente.
- El director de juego puede quitar manualmente cualquier anotación antes de que expire.
- La interfaz distingue las anotaciones permanentes de las temporales sin depender únicamente del color.

### US5 — Ocultar y revisar participantes

Como director/a de juego, quiero ocultar a un participante que ha muerto para retirarlo del orden activo sin perder sus datos, y poder consultarlo si lo necesito.

**Escenarios de aceptación:**

- Cada participante activo tiene una acción para ocultarlo o marcarlo como muerto.
- Los participantes ocultos se conservan en el encuentro, se muestran en una sección separada al final de la interfaz y esa sección está colapsada por defecto.
- El usuario puede expandir la sección para revisar los participantes ocultos y volver a mostrarlos.
- Los participantes ocultos no reciben turnos ni afectan al avance de la ronda.
- Si se oculta al participante actual, el siguiente participante activo pasa a ser el actual; si no quedan participantes activos, no hay turno actual.
- Si se vuelve a mostrar un participante, se incorpora de nuevo al orden activo según su iniciativa y las reglas de desempate.
- Ocultar a un participante no elimina sus anotaciones ni sus datos.

### US6 — Reiniciar el encuentro

Como director/a de juego, quiero reiniciar todo el encuentro para empezar de nuevo sin datos anteriores.

**Escenarios de aceptación:**

- Hay un botón claramente identificado para reiniciar todo.
- Antes de reiniciar, la aplicación pide confirmación para evitar una pérdida accidental.
- Al confirmar, se eliminan todos los participantes, sus anotaciones y estados, y el contador vuelve a la ronda 1 sin participante actual.
- Si se cancela la confirmación, el encuentro permanece sin cambios.

## Requisitos funcionales

- **FR-001:** La aplicación debe permitir añadir participantes con nombre e iniciativa numérica.
- **FR-002:** La lista activa debe ordenarse automáticamente de mayor a menor iniciativa; el valor más alto va primero.
- **FR-003:** Los empates deben conservar el orden de inserción.
- **FR-004:** El primer participante de la lista activa debe ser el participante actual.
- **FR-005:** Un botón debe avanzar al siguiente participante activo.
- **FR-006:** La ronda debe comenzar en 1 y aumentar cuando todos los participantes activos hayan actuado y el turno vuelva al primero.
- **FR-007:** La aplicación debe permitir añadir varias anotaciones a cada participante.
- **FR-008:** Cada anotación debe tener texto y una duración finita expresada en rondas o duración infinita.
- **FR-009:** Las anotaciones finitas de participantes activos deben reducir su duración al completar cada ronda y eliminarse al llegar a cero.
- **FR-010:** El usuario debe poder eliminar manualmente anotaciones, incluidas las infinitas.
- **FR-011:** La aplicación debe permitir ocultar participantes sin eliminarlos y mostrarlos en una sección separada, al final y colapsada por defecto.
- **FR-012:** Los participantes ocultos no deben participar en el orden de turnos ni en el cálculo de fin de ronda; debe ser posible restaurarlos.
- **FR-013:** La aplicación debe proporcionar un botón para reiniciar todo el encuentro, con confirmación antes de eliminar los datos.
- **FR-014:** Al reiniciar, deben borrarse participantes, anotaciones y estados, y la ronda debe volver a 1.
- **FR-015:** La aplicación debe validar las entradas y comunicar errores de forma comprensible.
- **FR-016:** La aplicación debe ejecutarse enteramente en el navegador, con frontend y lógica escritos en JavaScript, sin requerir backend.

## Requisitos no funcionales

- **NFR-001:** La interfaz debe estar optimizada principalmente para uso en PC y escritorio.
- **NFR-002:** El participante actual, el orden, la ronda y las anotaciones deben poder identificarse de un vistazo.
- **NFR-003:** Añadir participantes, avanzar turnos, ocultar participantes y reiniciar deben ser acciones sencillas y claramente accesibles.
- **NFR-004:** La interfaz debe seguir siendo utilizable en pantallas más pequeñas, aunque el uso principal sea en PC.
- **NFR-005:** La información importante no debe distinguirse exclusivamente mediante colores.
- **NFR-006:** La solución debe utilizar JavaScript para la aplicación y no depender de servicios de servidor.

## Criterios de éxito

- El director de juego puede añadir participantes y verlos ordenados correctamente por iniciativa.
- El botón de avance actualiza el participante actual y aumenta la ronda exactamente al completar una vuelta de la lista activa.
- Las anotaciones temporales descuentan rondas y expiran cuando corresponde.
- Las anotaciones infinitas permanecen hasta su eliminación manual.
- Los participantes ocultos quedan fuera del orden activo, pero se pueden revisar y restaurar.
- El reinicio elimina los datos del encuentro solo después de confirmar y deja la aplicación en la ronda 1 vacía.
- La interfaz permite operar el seguimiento del encuentro cómodamente desde un ordenador.

## Entidades principales

- **Encuentro:** lista de participantes, número de ronda actual y posición del turno activo.
- **Participante:** identificador, nombre, valor numérico de iniciativa, estado visible u oculto y lista de anotaciones.
- **Anotación:** identificador, texto y duración restante en rondas o duración infinita.

## Fuera de alcance

- Backend, cuentas de usuario, autenticación y almacenamiento en la nube.
- Sincronización entre dispositivos o colaboración en tiempo real.
- Cálculo automático de tiradas, modificadores o reglas de combate.
- Gestión de hojas de personaje, campañas, inventario, puntos de golpe o hechizos, salvo que se añadan en una especificación posterior.

## Decisiones de comportamiento

- La lista activa se ordena de mayor a menor iniciativa, por lo que el número más alto actúa primero.
- En caso de empate, se mantiene el orden de inserción.
- El participante actual es el primero de la lista activa.
- El avance del turno rota el orden activo para mantener al participante actual en la primera posición.
- Una ronda se considera completada cuando todos los participantes activos han actuado y el turno vuelve al primero.
- Las anotaciones finitas de participantes activos descuentan duración al completar una ronda; las infinitas no expiran automáticamente.
- Los participantes ocultos permanecen guardados en el estado del encuentro, en una sección colapsada al final, y no actúan hasta que se restauren.
- Reiniciar requiere confirmación y borra todos los datos del encuentro, incluidos participantes ocultos y anotaciones.

## Pendiente de decisión

- Si el estado del encuentro debe conservarse al cerrar o recargar el navegador. La especificación requiere funcionamiento sin backend, pero aún no define persistencia local entre sesiones.
- Si se necesita una acción explícita para volver a una ronda anterior.
