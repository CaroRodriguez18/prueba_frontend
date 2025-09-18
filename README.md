# PRUEBA TÉCNICA CAROLINA RODRÍGUEZ
# liga-pokemon-frontend
Interfaz frontend del proyecto Pokémon Async League, construida con Vue.js. Esta app consume el backend del repositorio: 'prueba_backend' para mostrar combates, ranking, etc. El README incluye cómo levantarla, estructura general y funcionalidades esperadas.

## Stack y arquitectura
⦁	Framework frontend: Vue.js (versión según package.json) 
⦁	Lenguajes / tecnologías: JavaScript, CSS, HTML, (posiblemente Vue Router, Vuex o composición de estado, dependiendo de código específico) 
⦁	Herramientas de configuración / build: Babel, ESLint, configuración de vue.config.js 
⦁	Servidor de desarrollo con recarga en caliente (“hot-reloads”) para facilitar desarrollo. 

## Requisitos previos
Asegúrate de tener instalados:
- Node.js (versión recomendada: 16 o superior)
- npm (se instala junto con Node.js)
- Backend corriendo o al menos accesible (URL) para consumir APIs (endpoints) del backend.

## Instalar dependencias
```bash
npm install
```

## Configurar variables de entorno si aplica (por ejemplo, URL base del backend). 
\src\api.js
baseURL: 'http://localhost:8000/api/',

### Ejecutar en modo de desarrollo
```bash
npm run serve
```
La app se levantará en http://localhost:8080 (o el puerto que Vue indique).

### Compilar para producción
```bash
npm run build
```

## Estructura de carpetas
prueba_frontend/
├── public/                # archivos estáticos públicos
├── src/                   # código fuente (componentes Vue, vistas, assets, etc.)
├── .eslintrc.cjs          # configuración de linter
├── babel.config.js        # configuración de Babel
├── jsconfig.json          # configuración de paths / alias JS
├── vue.config.js          # configuración específica de Vue (build, devserver, etc.)
├── package.json           # dependencias, scripts
├── package-lock.json      # lockfile
└── README.md              # este documento

## Rutas / Vistas esperadas
| Ruta                   | Vista                | Funcionalidad esperada                                                               |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `/battles`             | Listar combates      | Mostrar combates existentes, estado, resultados                                      |
| `/battle/:id`          | Detalle de combate   | Mostrar detalles de cada combate                                                     |
| `/pokemons`            | Detalle de pokemones | CRUD Pokemones                                                                       |
| `/scenarios`           | Detalle de escenarios| CRUD Escenarios                                                                      |

## Integración con backend
⦁	Definir base URL del backend en variable de entorno (por ejemplo, API_URL).
⦁	Verificar endpoints existentes en backend (por ejemplo: autenticación, obtener listado de combates, crear combate, obtener ranking).
⦁	Manejar respuestas HTTP, errores (e.g. si backend devuelve 401, 404, etc.).
⦁	Autenticación: si hay login, token/session, guardar token en localStorage o cookies según lo que implementes.
⦁	Cross-origin / CORS: asegurarse de que el backend permita peticiones desde el origen del frontend (localhost:8080) si están en dominios distintos.

## Guía de troubleshooting

⦁ Errores al correr npm install
	-   Verifica versión de Node.js / npm
	-   Limpia caché de npm si hace falta (npm cache clean --force)
	-   Borra node_modules y package-lock.json, luego reinstala
⦁ Hot reload / servidor dev no arranca
	-   Revisar si puerto 8080 está libre
	-   Verificar api.js, vue.config.js y scripts en package.json
	-   Verificar configuración del proxy (si usas proxy al backend)
⦁ Problemas de CORS al llamar al backend
	-   Backend debe tener permisos (headers) para origen del frontend
	-   Si pruebas en producción, rutas bien configuradas
⦁ Errores al hacer build
	-   Verificar imports relativos / alias definidos en jsconfig.json o en vue.config.js
	-   Verificar versiones de dependencias que puedan estar incompatibles
    