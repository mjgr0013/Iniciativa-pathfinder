# Especificación: Iniciativa Pathfinder

> **Estado:** especificación vigente; refleja el comportamiento implementado (GitHub Spec Kit)
> **Idioma de la interfaz:** español
> **Plataforma:** aplicación web de frontend que se ejecuta íntegramente en el navegador, sin backend. El código fuente está escrito en TypeScript y se compila a JavaScript.

## Resumen

Aplicación web para que un director de juego gestione el orden de iniciativa durante un encuentro de Pathfinder. Permite añadir participantes con un valor numérico de iniciativa, verlos en orden de actuación, avanzar turnos y gestionar anotaciones temporales o permanentes, tanto de cada participante como globales del encuentro.

Los participantes Gorr, Lyra, Caedren, Kumiko, Adriana y Shary estarán disponibles siempre como participantes predeterminados del encuentro.

## Problema

Durante un encuentro, el director de juego necesita consultar rápidamente quién actúa ahora, quién sigue, en qué ronda está el combate y qué anotaciones siguen vigentes para cada participante.

## Usuario principal

- **Director/a de juego:** añade participantes y anotaciones, controla el avance de los turnos y las rondas, y oculta o restaura participantes.

## Participantes predeterminados

Al iniciar un encuentro nuevo o reiniciar el encuentro actual, la aplicación debe crear automáticamente estos participantes:

1. Gorr
2. Lyra
3. Caedren
4. Kumiko
5. Adriana
6. Shary

**Escenarios de aceptación:**

- Los seis participantes aparecen como activos al iniciar sin datos guardados o al reiniciar. Si hay un encuentro guardado en el navegador, se restaura tal como estaba.
- Al iniciar sin datos, los participantes deben tener la iniciativa establecida en 0 hasta que el director introduzca otra.
- Cada participante predeterminado muestra su retrato, ligado al personaje y no al nombre (se conserva aunque se renombre).
- El usuario puede cambiar el nombre y la iniciativa de cualquier participante predeterminado.
- El usuario puede ocultar cualquier participante predeterminado sin eliminarlo permanentemente.
- El usuario puede restaurar cualquier participante predeterminado oculto.
- Los participantes predeterminados no se pueden eliminar permanentemente; solo ocultar.
- El reinicio elimina los participantes adicionales y restablece Gorr, Lyra, Caedren, Kumiko, Adriana y Shary.

## Historias de usuario y escenarios

### US1 — Añadir participantes

Como director/a de juego, quiero añadir participantes con su nombre y su número de iniciativa para preparar el orden de actuación.

**Escenarios de aceptación:**

- Al añadir un participante con nombre e iniciativa válidos, aparece en la lista.
- La iniciativa se acepta y valida como número (puede ser negativa).
- El nombre es obligatorio y tiene como máximo 40 caracteres.
- El orden de actuación es de mayor a menor iniciativa; el valor más alto actúa primero.
- Si hay empate, se conserva el orden en que se añadieron los participantes empatados.
- La aplicación informa de forma clara, junto al formulario, si falta el nombre o la iniciativa no es válida.
- Un participante puede añadirse como activo o directamente como oculto.
- Los participantes añadidos muestran, en lugar de retrato, un recuadro del mismo tamaño con sus iniciales.
- El nombre y la iniciativa de cualquier participante se editan en línea, pulsando sobre ellos: Enter guarda, Escape cancela y salir del campo guarda si el valor es válido.
- Los participantes predeterminados ya existen y pueden editarse sin tener que volver a añadirse.
- Un participante añadido puede eliminarse permanentemente, junto con sus anotaciones, tras confirmarlo.

### US2 — Avanzar al siguiente participante

Como director/a de juego, quiero avanzar con un botón para actualizar quién es el participante actual.

**Escenarios de aceptación:**

- El primer participante visible de la lista activa es siempre el actual y se destaca visualmente (también con la etiqueta «Turno actual», no solo con color).
- Al pulsar el botón de avanzar, el siguiente participante en orden de iniciativa pasa a ser el actual y la lista rota para mostrarlo primero.
- Al avanzar desde el participante activo de menor iniciativa, el turno vuelve al de mayor iniciativa y comienza una nueva ronda.
- Un separador en la lista indica dónde empieza la siguiente ronda.
- Mientras el encuentro no ha empezado (ronda 1 y nadie ha actuado todavía), el turno es siempre del participante de mayor iniciativa: al añadir a alguien con más iniciativa, editar iniciativas o restaurar a un participante, el turno pasa a quien quede primero. Una vez alguien ha actuado, quien se incorpora con más iniciativa que el actual espera a la ronda siguiente.
- Si no hay participantes activos, el botón no avanza el turno ni incrementa la ronda.
- El director puede dar el turno a otro participante con doble clic en su tarjeta (o pulsación larga en pantallas táctiles), tras confirmarlo; un clic simple no cambia el turno.

### US3 — Consultar el contador de rondas

Como director/a de juego, quiero ver la ronda actual para saber cuánto ha avanzado el encuentro.

**Escenarios de aceptación:**

- El contador comienza en la ronda 1 cuando empieza el seguimiento del encuentro.
- La ronda aumenta en uno cuando todos los participantes activos han actuado y el turno vuelve al de mayor iniciativa.
- El número de ronda actual está visible en la interfaz.

### US4 — Añadir y gestionar anotaciones

Como director/a de juego, quiero añadir anotaciones a cada participante con una duración en rondas o permanente para recordar efectos o información relevante.

**Escenarios de aceptación:**

- Cada participante puede tener cero o más anotaciones.
- Una anotación incluye un texto (obligatorio, como máximo 80 caracteres) y una duración: un número entero de rondas o duración infinita (se indica con 0).
- Las anotaciones con duración finita muestran cuántas rondas les quedan («Última ronda» cuando queda una, con un indicador adicional que no depende del color).
- Una anotación la desencadena el participante que tiene el turno al añadirla, y está vigente hasta que vuelve a ser su turno: descuenta una ronda cada vez que vuelve el turno de quien la desencadenó y expira en ese momento al llegar a cero.
- Las anotaciones finitas muestran «hasta» seguido del retrato o las iniciales de quien las desencadenó, aunque ese participante se haya ocultado o eliminado (en ese caso cuenta su posición en la iniciativa). Al pasar el puntero se indica cuándo expiran.
- Ejemplo: en el turno de «Personaje 1» se aplica «Aturdido, 1 ronda» a «Personaje 2», que actúa después. «Personaje 2» está aturdido durante su turno y el estado expira al volver el turno de «Personaje 1».
- Ejemplo: en el turno de «Personaje 1» se añade una anotación de 1 ronda a «Personaje 1» y otra de 2 rondas a «Personaje 2». La de «Personaje 1» expira al volver su turno en la ronda 2; la de «Personaje 2» pasa a «Última ronda» en ese momento y expira al volver el turno de «Personaje 1» en la ronda 3.
- Una anotación añadida en el turno del último participante no expira al empezar la ronda siguiente.
- Una anotación finita se elimina automáticamente cuando su duración llega a cero.
- Una anotación infinita permanece hasta que el director de juego la quite manualmente.
- El director de juego puede quitar manualmente cualquier anotación antes de que expire.
- Además de las de cada participante, existen anotaciones globales del encuentro (ver «Funcionalidades adicionales»).
- La interfaz distingue las anotaciones permanentes de las temporales sin depender únicamente del color.

### US5 — Ocultar y revisar participantes

Como director/a de juego, quiero ocultar a un participante que ha muerto para retirarlo del orden activo sin perder sus datos, y poder consultarlo si lo necesito.

**Escenarios de aceptación:**

- Cada participante activo tiene una acción para ocultarlo o marcarlo como muerto.
- Los participantes ocultos se conservan en el encuentro, se muestran en una sección separada al final de la interfaz y esa sección está colapsada por defecto.
- El usuario puede expandir la sección para revisar los participantes ocultos y volver a mostrarlos.
- Los participantes ocultos no reciben turnos ni afectan al avance de la ronda.
- Si se oculta al participante actual, el siguiente participante activo pasa a ser el actual; si no quedan participantes activos, no hay turno actual.
- Si el participante actual es el último de la ronda y se oculta o elimina, equivale a pulsar el botón de avanzar: la ronda se completa, el turno pasa al primero y las anotaciones descuentan como si se hubiera avanzado. Las anotaciones del participante retirado no se descuentan.
- Si se vuelve a mostrar un participante, se incorpora de nuevo al orden activo según su iniciativa y las reglas de desempate.
- Ocultar a un participante no elimina sus anotaciones ni sus datos.

### US6 — Reiniciar el encuentro

Como director/a de juego, quiero reiniciar el encuentro para empezar de nuevo sin participantes ni anotaciones adicionales.

**Escenarios de aceptación:**

- Hay un botón claramente identificado para reiniciar todo.
- Antes de reiniciar, la aplicación pide confirmación para evitar una pérdida accidental.
- Al confirmar, se eliminan los participantes adicionales y sus anotaciones, se restablecen Gorr, Lyra, Caedren, Kumiko, Adriana y Shary como participantes activos con iniciativa 0 y sin anotaciones.
- Si se cancela la confirmación, el encuentro permanece sin cambios.

## Requisitos funcionales

- **FR-001:** La aplicación debe permitir añadir participantes con nombre e iniciativa numérica.
- **FR-002:** El orden de actuación debe ser de mayor a menor iniciativa; el valor más alto actúa primero. La lista activa se muestra rotada a partir del participante actual.
- **FR-003:** Los empates deben conservar el orden de inserción.
- **FR-004:** El primer participante de la lista activa debe ser el participante actual.
- **FR-005:** Un botón debe avanzar al siguiente participante activo.
- **FR-006:** La ronda debe comenzar en 1 y aumentar cuando todos los participantes activos hayan actuado y el turno vuelva al primero.
- **FR-007:** La aplicación debe permitir añadir varias anotaciones a cada participante.
- **FR-008:** Cada anotación debe tener texto y una duración finita expresada en rondas o duración infinita.
- **FR-009:** Las anotaciones finitas de participantes activos deben reducir su duración cada vez que vuelve el turno del participante que las desencadenó (quien tenía el turno al añadirlas), y eliminarse al llegar a cero.
- **FR-010:** El usuario debe poder eliminar manualmente anotaciones, incluidas las infinitas.
- **FR-011:** La aplicación debe permitir ocultar participantes sin eliminarlos y mostrarlos en una sección separada, al final y colapsada por defecto.
- **FR-012:** Los participantes ocultos no deben participar en el orden de turnos ni en el cálculo de fin de ronda; debe ser posible restaurarlos.
- **FR-013:** La aplicación debe proporcionar un botón para reiniciar todo el encuentro, con confirmación antes de eliminar los datos.
- **FR-014:** Al reiniciar, deben eliminarse los participantes adicionales y sus anotaciones, restableciéndose Gorr, Lyra, Caedren, Kumiko, Adriana y Shary con iniciativa 0, sin anotaciones y visibles.
- **FR-015:** La aplicación debe permitir modificar el nombre y la iniciativa de cualquier participante, incluidos los predeterminados.
- **FR-016:** La aplicación debe validar las entradas y comunicar errores de forma comprensible.
- **FR-017:** La aplicación debe ejecutarse enteramente en el navegador, sin requerir backend.
- **FR-018:** El estado del encuentro debe conservarse en el navegador al cerrar o recargar la página.
- **FR-019:** Cambiar manualmente el participante actual debe requerir una acción deliberada (doble clic o pulsación larga) y confirmación.

## Requisitos no funcionales

- **NFR-001:** La interfaz debe estar optimizada principalmente para uso en PC y escritorio.
- **NFR-002:** El participante actual, el orden, la ronda y las anotaciones deben poder identificarse de un vistazo.
- **NFR-003:** Añadir participantes, avanzar turnos, ocultar participantes y reiniciar deben ser acciones sencillas y claramente accesibles.
- **NFR-004:** La interfaz debe seguir siendo utilizable en pantallas más pequeñas, aunque el uso principal sea en PC.
- **NFR-005:** La información importante no debe distinguirse exclusivamente mediante colores.
- **NFR-006:** La solución debe ejecutarse como JavaScript en el navegador (compilado desde TypeScript) y no depender de servicios de servidor.
- **NFR-007:** La lógica del encuentro (turnos, rondas, duración de anotaciones) debe estar separada de la interfaz y cubierta por tests automatizados.

## Criterios de éxito

- Al iniciar o reiniciar, Gorr, Lyra, Caedren, Kumiko, Adriana y Shary están presentes y pueden editarse.
- El director de juego puede añadir otros participantes y verlos ordenados correctamente por iniciativa.
- El botón de avance actualiza el participante actual y aumenta la ronda exactamente al completar una vuelta de la lista activa.
- Las anotaciones temporales (de participante o globales) descuentan una ronda cada vez que vuelve el turno de quien las desencadenó, expiran al llegar a cero y muestran de quién es ese turno.
- Las anotaciones infinitas permanecen hasta su eliminación manual.
- Los participantes ocultos quedan fuera del orden activo, pero se pueden revisar y restaurar.
- El reinicio elimina participantes adicionales y configuraciones modificadas solo después de confirmar, dejando los seis participantes predeterminados con iniciativa 0.
- La interfaz permite operar el seguimiento del encuentro cómodamente desde un ordenador.

## Entidades principales

- **Encuentro:** lista de participantes, número de ronda actual, participante actual y lista de anotaciones globales.
- **Participante:** identificador, nombre, valor numérico de iniciativa, orden de inserción (para desempates), estado visible u oculto, personaje predeterminado al que corresponde (si lo es) y lista de anotaciones.
- **Anotación:** identificador, texto, duración restante en rondas o duración infinita, y el turno en que se desencadenó (participante, nombre, iniciativa y orden).

## Fuera de alcance

- Backend, cuentas de usuario, autenticación y almacenamiento en la nube.
- Sincronización entre dispositivos o colaboración en tiempo real.
- Cálculo automático de tiradas, modificadores o reglas de combate.
- Gestión de hojas de personaje, campañas, inventario, puntos de golpe o hechizos, salvo que se añadan en una especificación posterior.

## Decisiones de comportamiento

- Los participantes predeterminados son Gorr, Lyra, Caedren, Kumiko, Adriana y Shary.
- Los seis participantes se crean al iniciar un encuentro nuevo y al reiniciar.
- Al reiniciar tienen iniciativa 0, están visibles y sin anotaciones.
- La lista activa se ordena de mayor a menor iniciativa, por lo que el número más alto actúa primero.
- En caso de empate, se mantiene el orden de inserción.
- El participante actual es el primero de la lista activa.
- Antes de que nadie actúe (ronda 1 con el turno en el de mayor iniciativa), el turno sigue al de mayor iniciativa aunque cambie el orden; nadie queda relegado a la ronda 2 por añadirse antes de empezar.
- El avance del turno rota el orden activo para mantener al participante actual en la primera posición.
- Una ronda se considera completada cuando todos los participantes activos han actuado y el turno vuelve al primero.
- Ocultar o eliminar al participante actual cuenta como terminar su turno; si era el último de la ronda, la ronda se completa. Si no queda ningún otro participante activo, la ronda no avanza.
- Toda anotación finita, de participante o global, se cuenta desde el turno en que se añade: descuenta una ronda cada vez que vuelve el turno de quien la desencadenó y expira en ese momento al llegar a cero (si ese participante se oculta o elimina, cuenta su posición en la iniciativa). Las anotaciones de participantes ocultos no descuentan. Las infinitas no expiran automáticamente. Cambiar el turno a mano no descuenta.
- Los participantes ocultos permanecen guardados en el estado del encuentro, en una sección colapsada al final, y no actúan hasta que se restauren.
- Reiniciar requiere confirmación y restablece todos los datos del encuentro a los participantes predeterminados.
- La lista activa se muestra rotada a partir del participante actual; un separador indica dónde empieza la siguiente ronda (el participante de mayor iniciativa).
- El estado del encuentro se conserva en el navegador (`localStorage`) al cerrar o recargar la página. Los datos guardados por versiones anteriores se migran automáticamente; si están corruptos, se inicia un encuentro nuevo.
- Los participantes predeterminados no se pueden eliminar permanentemente; solo ocultar.
- No existe una acción para volver a una ronda o turno anterior; el avance es solo hacia delante.

## Funcionalidades adicionales

Comportamientos presentes en la aplicación que amplían esta especificación:

- **Anotaciones globales:** anotaciones del encuentro no asociadas a ningún participante. Su duración se cuenta igual que la de las de participante: desde el turno en que se crean, mostrando «hasta» y el token de quien las desencadenó.
- **Retratos:** los participantes predeterminados muestran su retrato; el resto, un recuadro del mismo tamaño con sus iniciales (los números se conservan: «Orco 2» → «O2») sobre un color estable según el nombre.
- **Añadir oculto:** un participante puede añadirse directamente a la sección de ocultos.
- **Cambiar el turno manualmente:** con doble clic en una tarjeta activa (o pulsación larga en pantallas táctiles), y tras confirmarlo en un diálogo, ese participante pasa a ser el actual, sin cambiar la ronda ni descontar anotaciones. Si se cancela, el turno no cambia. Un clic simple no cambia el turno, para evitar cambios accidentales.
