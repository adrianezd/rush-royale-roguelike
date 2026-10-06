# Rush Royale Roguelike

Tower defense roguelike para móvil y escritorio inspirado en Rush Royale. Fan game no oficial, sin anuncios ni compras.

## Qué tiene

- **7 modos**: Clásico, Expedición (mapa con combates, élites, tiendas, eventos, hogueras, tesoros y jefe final), Aventura con estrellas, Supervivencia infinita, Fusión (invoca y fusiona torres iguales), Desafío diario y Jefes.
- **12 torres** con rarezas: Fuego, Hielo, Bosque, Rayo, Veneno, Viento, Francotirador, Cañón, Arcano y las legendarias Dragón, Cronomante y Alquimista.
- **6 héroes** con habilidad activa y pasiva: Aria, Brann, Sylva, Volt, Morga y León.
- **Mazo de 5 cartas**, colección con niveles permanentes y **cofres** (madera, plata, real y uno gratis al día).
- **7 jefes** con mecánicas propias y **17 bendiciones** roguelike entre niveles.
- 8 biomas, proyectiles, críticos, números de daño, prioridad de disparo, pausa, olas automáticas.
- Perfil con nivel de cuenta, 20 logros, guía, novedades y códigos.

## Estructura

Sin build: `index.html` carga scripts clásicos de `js/` que comparten el scope global.

- `js/core.js`: versión, novedades y utilidades.
- `js/data.js`: torres, enemigos, jefes, niveles, biomas, héroes, bendiciones y modos.
- `js/meta.js`: progreso permanente, cartas, cofres, logros y códigos.
- `js/grid.js`, `js/draw.js`, `js/entities.js`: tablero, dibujo vectorial y entidades.
- `js/game.js`: partida, olas, héroes, fusión, entrada y guardado.
- `js/modes.js`: Desafío diario y Expedición. `js/menus.js`: pantallas de menú.
- `assets/`: logo, retratos de héroes y cofres en SVG.

Al tocar un css o js, sube su `?v=` en `index.html`.
