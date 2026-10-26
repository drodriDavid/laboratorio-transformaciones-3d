# Laboratorio de transformaciones 3D

Aplicación educativa estática para practicar transformaciones en Informática Gráfica. La interfaz está centrada en una escena 3D grande construida con Three.js, con excavadora jerárquica, malla cilíndrica, luces, ejes y rejilla; incluye controles de articulación, selección, arrastre, animación, transformaciones, inspección de matrices y un editor ejecutable de llamadas `mat4.*`.

El botón **Explorar la P2** abre un recorrido visual de cinco conceptos: construcción de mallas, árbol jerárquico, selección por pieza, arrastre con límites y animación temporal. Cada pop-up tiene una acción que selecciona o mueve la parte correspondiente en la escena.

El botón **Pantalla completa** convierte el visor 3D en una experiencia inmersiva; los pop-ups permanecen disponibles encima del render para explicar cada concepto mientras se observa la escena.

## Ejecutar localmente

No necesita instalación ni backend. Como el navegador bloquea algunos recursos al abrir `index.html` directamente, sirve la carpeta con cualquier servidor estático:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000` en el navegador. También puedes usar la extensión Live Server de VS Code.

## Publicar en GitHub Pages

1. Crea un repositorio y sube `index.html`, `styles.css`, `app.js` y `README.md` a la rama `main`.
2. En GitHub, abre **Settings → Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Guarda la configuración y espera a que GitHub muestre la URL publicada.

La aplicación no usa backend, bundler ni variables de entorno. Three.js se carga desde jsDelivr en `index.html`, por lo que funciona directamente en GitHub Pages.

## Convención matemática

La demo usa vectores columna y matrices de glMatrix. Si se selecciona `TRS`, el código llama a `translate`, después a las rotaciones y finalmente a `scale`; el vértice se transforma efectivamente en el orden inverso `S → R → T`. La matriz `M` y el vértice `(1, 1, 1)` se actualizan en tiempo real para que el alumno pueda contrastar la explicación con la escena.

El editor permite probar líneas como `mat4.translate(M, M, [1.2, 0.3, 0.0]);`, `mat4.rotateY(M, M, [0.61]);` y `mat4.scale(M, M, [1.4, 0.7, 1.0]);`. El código de la P2 concreta no se presupone porque la conversación original no incluía el correo ni el enunciado; los valores, presets y textos son un punto de partida adaptable a cualquier práctica de transformaciones.
