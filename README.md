# 📖 Para Lau · 27 de Septiembre

Un libro digital artesanal e interactivo concebido con una encuadernación de lujo en **cuero antiguo coreano repujado en oro** y un diseño interior en **acuarela botánica**, celebrando su cumpleaños con la carta íntegra y las fotografías de la celebración.

---

## ✨ Características Especiales

* 📖 **Animación Física de Libro 3D:** Hojas con curvatura y sombras realistas mediante `page-flip`. Puedes pasar las páginas arrastrando las esquinas con el ratón o el dedo en pantallas táctiles, o con los botones de la barra inferior.
* 🌿 **Encuadernación en Cuero Antiguo Coreano:** Cubierta rígida exterior con textura de cuero envejecido, nervaduras en el lomo y filigranas de flor de loto doradas.
* 🎨 **Diseño Interior en Acuarela:** Páginas sobre papel de acuarela con ilustraciones botánicas temáticas integradas.
* 🎵 **Música Integrada ("invisible string" - Taylor Swift):** Reproductor con la canción completa (4:12), control de reproducción en la barra inferior, enlace oficial a Spotify y activación automática en la página correspondiente.
* 📸 **Fotografías con Visor Lightbox:** Las fotos tomadas durante la celebración (25 de Septiembre) se pueden ampliar en alta resolución haciendo clic sobre ellas.
* 📑 **Índice Interactivo:** Acceso rápido a cualquier capítulo desde la barra inferior o desde la página de índice.
* 🔊 **Sonido Táctil de Páginas:** Efecto de sonido Foley orgánico y suave procesado con Web Audio API.

---

## 🚀 Despliegue en Línea (GitHub Pages)

El proyecto está configurado para desplegarse automáticamente en GitHub Pages mediante GitHub Actions:

🔗 **Enlace en vivo:** [https://alejandro18000.github.io/libro-lau/](https://alejandro18000.github.io/libro-lau/)

---

## 💻 Ejecución Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

---

## 🛠️ Cómo Agregar Nuevos Capítulos en el Futuro

El libro está diseñado para ser **modular y extensible**:

1. Abre el archivo `src/chapters/chaptersData.js`.
2. Añade el nuevo capítulo en la lista `chapters` y las nuevas páginas en `bookPages`.
3. Guarda los cambios y ejecuta `npm run build` o haz push a GitHub.
