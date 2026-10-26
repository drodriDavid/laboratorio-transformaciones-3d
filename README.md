# Laboratorio visual de la práctica 2

Aplicación educativa estática para practicar Informática Gráfica con Three.js: excavadora jerárquica, malla cilíndrica indexada, selección, arrastre, animación, cámaras y composición de matrices. El visor ocupa toda la ventana; las explicaciones aparecen a los lados y los controles interactivos en la parte inferior.

El selector **Idioma / Language** cambia entre español e inglés, incluyendo explicaciones, controles, accesibilidad y feedback de ejercicios. La preferencia se guarda localmente si el navegador permite almacenamiento; cambiar el idioma conserva la pose y los valores actuales.

## Aprender probando

Elige un concepto a la izquierda y pulsa **Preparar experimento** en la explicación. Usa los controles inferiores para completar el ejercicio; el feedback confirma el resultado:

1. Malla: U=40, V=4, triángulos y normales visibles. Se generan 200 vértices, 320 triángulos y 960 índices. La superficie lateral está cerrada por la costura, sin tapas.
2. Jerarquía: mover plataforma y después cazo para observar herencia e independencia. Los grupos de pivote no heredan el escalado de la geometría.
3. Selección: seleccionar dos piezas por clic y después el fondo. La identidad de la pieza se separa del material amarillo.
4. Límites: llevar la pluma a 80° e intentar aumentar el ángulo otra vez. También se limitan brazo y cazo.
5. Animación: activar, pausar y comparar cuatro cámaras (perspectiva, planta, alzado y perfil). La animación usa tiempo transcurrido; la órbita de cámara tiene estado independiente.

En la barra inferior se pueden elegir piezas, cambiar ángulos, variar U/V, ver triángulos, normales y sombreado plano/suave, activar animación y alternar cámaras. En móvil la barra tiene desplazamiento interno. **Ocultar controles** permite despejar el visor sin cerrar la explicación.

Controles directos: clic para seleccionar; arrastre para mover la pieza; Mayús + arrastre para orbitar; rueda para zoom; teclas 1–5 para seleccionar, flechas para mover, A para animar y V para cambiar vistas. Los atajos no interfieren al escribir en el editor o usar un campo de formulario.

El botón **Ocultar navegador** activa además la pantalla completa nativa, conservando ambos paneles. Los navegadores requieren un clic para ocultar sus barras; el render ya ocupa la ventana por defecto sin necesitar ese permiso. Escape permite salir de la pantalla completa y cerrar los paneles.

## Ejecutar localmente

No necesita instalación ni backend. Como el navegador bloquea algunos recursos al abrir `index.html` directamente, sirve la carpeta con cualquier servidor estático:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000` en el navegador. También puedes usar la extensión Live Server de VS Code.

## Publicar en GitHub Pages

1. Crea un repositorio y sube `index.html`, `lab.css`, `i18n.js`, `three-app.js` y `README.md` a la rama `main`.
2. En GitHub, abre **Settings → Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Guarda la configuración y espera a que GitHub muestre la URL publicada.

La aplicación no usa backend, bundler ni variables de entorno. Three.js 0.160.0 se carga desde jsDelivr en `index.html`, por lo que requiere conexión. Se puede descargar esa dependencia y sustituir la URL del script por una ruta local para uso offline. Las rutas de la aplicación son relativas y funcionan dentro de un repositorio de GitHub Pages. Los antiguos archivos `app.js`, `styles.css`, `focus-3d.css`, `guide.css` y `fullscreen.css` no se cargan en la versión actual.

## Convención matemática

En **Laboratorio de transformaciones y código**, los deslizadores, el orden, la matriz y un vértice de ejemplo están conectados al cubo. Se usan vectores columna: con `M=T·R·S`, el punto recibe `S → R → T`. Dentro de R, las llamadas son X, Y, Z y su aplicación efectiva se invierte. El editor interpreta cada llamada por separado, preservando repeticiones y orden, y compone la matriz con `THREE.Matrix4`; no carga ni ejecuta glMatrix ni JavaScript arbitrario.

Se admiten `mat4.translate(M, M, [1.2, 0.3, 0]);`, `mat4.rotateY(M, M, 0.61);`, `mat4.rotateY(M, M, glMatrix.toRadian(35));` y `mat4.scale(M, M, [1.4, 0.7, 1]);`, una por línea. También se conserva compatibilidad con el antiguo ángulo entre corchetes. Los errores indican la línea y conservan la última matriz válida.

## Alcance docente

Los conceptos y dimensiones de la excavadora se apoyan en el solucionario técnico de P2 aportado por el usuario. Es un laboratorio visual adaptable: no compila C++ ni sustituye las clases cgv del alumnado. La selección en esta versión usa Raycaster; el pop-up explica su relación con la selección por buffer de color de OpenGL clásico. Los límites son didácticos y no implementan detección de colisiones.
