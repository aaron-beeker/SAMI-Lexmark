# SAMI-Lexmark

Sistema Avanzado de Monitoreo de Inventario para las impresoras Lexmark arrendadas por **MUR Tecnologia** en el **Hospital Nacional Cayetano Heredia**. La plataforma combina sincronizacion en tiempo real con Firebase Firestore, inteligencia artificial generativa multi-proveedor, procesamiento offline con OCR local, y un diseno responsivo e intuitivo para optimizar el mantenimiento preventivo y asegurar la operatividad continua de los equipos de impresion.

---

## Tecnologias Principales

| Componente | Tecnologia |
|---|---|
| Frontend | React (JavaScript) + Vite |
| Estilos | Vanilla CSS con variables de diseno, modo oscuro, glassmorphism y micro-animaciones |
| Base de Datos | Firebase Firestore con sincronizacion reactiva en tiempo real y persistencia offline (IndexedDB) |
| IA Generativa | Google Gemini API (Tier 1), OpenRouter con modelos GPT-4o y Gemini Flash (Tier 2) |
| OCR Local | Tesseract.js para extraccion de texto desde imagenes sin conexion (Tier 3) |
| Parser Offline | Motor de analisis de texto local con regex avanzado para operacion sin internet (Tier 4) |
| Hojas de Calculo | SheetJS (XLSX) para importacion, analisis y exportacion de reportes Excel |
| Graficos y Metricas | Recharts para visualizacion interactiva de evolucion historica y facturacion |
| Despliegue | Vercel |

---

## Arquitectura del Software (MVC y SOLID)

El proyecto esta disenado bajo una arquitectura estructurada de Modelo-Vista-Controlador (MVC) y sigue estrictamente los principios de diseno de software SOLID:

```text
src/
|-- firebase.js                  # Configuracion del SDK de Firebase con persistencia offline
|-- main.jsx                     # Punto de entrada de React
|-- App.jsx                      # Orquestador raiz presentacional
|
|-- models/                      # CAPA MODELO (DIP: Inyeccion de db)
|   |-- PrinterModel.js          # Transacciones y flujos CRUD de impresoras
|   |-- StockModel.js            # Gestion de repuestos en deposito/hospital
|   |-- HistoryModel.js          # Bitacora general de auditoria
|   +-- BillingModel.js          # Registro de cortes y facturacion mensual
|
|-- controllers/                 # CAPA CONTROLADOR (Fachada/Facade)
|   |-- useAppController.js      # Orquestador y fachada de estados
|   +-- hooks/                   # SRP: Sub-hooks independientes
|       |-- useNavigation.js     # Rutas y filtros de criticidad
|       |-- useSettings.js       # Persistencia de credenciales
|       |-- useGeneralHistory.js # Auditoria de logs generales
|       |-- usePrinters.js       # CRUD, edicion en linea, paginacion y KPIs
|       |-- useStock.js          # Sustraccion y decrementos de stock
|       |-- useChat.js           # Conversacion, adjuntos y modal de revision IA
|       |-- useExcelImport.js    # Parseo y validacion de Excel
|       +-- useBilling.js        # Logica de cierres mensuales y lectura historica
|
|-- views/                       # CAPA VISTA (ISP: Props segregadas)
|   |-- TopAppBar.jsx            # Barra de herramientas superior
|   |-- Sidebar.jsx              # Navegacion en escritorio
|   |-- DashboardView.jsx        # Metricas, alertas de advertencia y stock critico
|   |-- InventoryView.jsx        # Tabla Excel-like interactiva y tarjetas moviles
|   |-- ChatView.jsx             # Asistente virtual inteligente de IA con modal de revision
|   |-- HistoryView.jsx          # Historial global de auditorias
|   |-- SettingsView.jsx         # Configuracion de API Keys
|   |-- HospitalMapView.jsx      # Mapa de geolocalizacion hospitalaria interactivo (SVG)
|   |-- PrinterModal.jsx         # Detalle de impresora y sub-historial
|   |-- StockView.jsx            # Vista de inventario de repuestos
|   |-- StockModal.jsx           # Seleccion para descuento y reposicion de repuestos
|   |-- BillingChartView.jsx     # Graficos de evolucion y cortes mensuales
|   +-- ExcelImportModal.jsx     # Previsualizacion antes de confirmar datos
|
+-- services/                    # SERVICIOS (OCP/LSP: Patron Estrategia)
    |-- PredictionService.js     # Algoritmo de desgaste y autonomia predictiva
    +-- GeminiService.js         # IA multi-proveedor, OCR, parser local y extraccion JSON
```

---

## Funcionalidades Clave

### 1. Dashboard de Metricas en Tiempo Real
- Visualiza la cantidad total de impresoras y su estado operativo (Operativo, Advertencia, Inoperativo).
- Tarjetas dinamicas con ubicaciones fisicas (Hospital vs. MUR).
- Resumen de alertas exclusivamente para equipos en estado de Advertencia.
- Indicadores de stock critico de consumibles en deposito y hospital.

### 2. Mapa de Geolocalizacion Hospitalaria
- Planos SVG interactivos tipo blueprint del hospital organizados por pisos (Piso 1, Piso 2, Piso 3, Externo/MUR).
- Cada area se ilumina con el color del peor estado de impresora que contiene (verde, amarillo, rojo, gris).
- Puntos de impresoras con animaciones de pulsacion para equipos con problemas.
- Tooltips interactivos con modelo, serie, IP, niveles de consumibles y caso CAS asignado.
- Boton de acceso directo al modal de edicion desde el mapa.

### 3. Tabla Interactiva de Inventario
- Edicion rapida en linea: doble clic en cualquier fila para modificar campos como niveles, ubicacion, IP, observaciones o casos CAS directamente desde la tabla.
- Buscador logico avanzado con operadores condicionales:
  - `&` para concatenar criterios de coincidencia (AND).
  - `!` para excluir terminos (NOT).
  - Ejemplo: `operativa & !soporte & MX431` (Muestra impresoras operativas de modelo MX431 que no esten en Soporte).
- Paginacion del lado del cliente (15 registros por pagina) con reseteo automatico al buscar o filtrar.
- Consumibles mostrados en orden fijo: Toner, Kit de Mantenimiento, Unidad de Imagen.

### 4. Asistente SAMI AI (Procesamiento Inteligente Multi-Proveedor)
- Envia fotos del panel fisico de las impresoras, adjunta reportes PDF, o escribe instrucciones en texto plano.
- Cascada automatica de 4 proveedores de procesamiento:
  - Tier 1: Google Gemini API (vision y texto).
  - Tier 2: OpenRouter (GPT-4o, GPT-4o-mini, Gemini Flash).
  - Tier 3: OCR local con Tesseract.js (sin conexion, solo imagenes).
  - Tier 4: Parser de texto local con regex (sin conexion, solo texto).
- Modal de revision obligatorio antes de guardar: el tecnico visualiza, corrige y confirma o rechaza los datos propuestos por la IA antes de que se escriban en la base de datos.
- Actualizacion parcial no destructiva: si se solicita actualizar solo un campo (ej. solo IPs), los demas campos del equipo se preservan intactos desde Firestore.

### 5. Actualizaciones Masivas por Lote
- Pega listas de multiples impresoras directamente en el chat para actualizaciones simultaneas.
- Formatos soportados (tanto por IA como por parser local offline):
  - Consumibles: `SERIE  58  45  54` (Toner, Kit Mantenimiento, Unidad Imagen).
  - Direcciones IP: `SERIE  192.168.82.37` o `SERIE  USB`.
  - Casos CAS y detalles: `SERIE  CAS-6062067-L4Z5X0  se espera visita tecnica`.
  - Observaciones: `SERIE  SIN GARANTIA`.
  - Formato mixto: `SERIE  192.168.82.37  OEI Jefatura  21  0  36`.
- Vista de resumen comparativo en el modal de revision mostrando datos actuales vs. propuestos.
- Procesamiento de lotes de hasta 40+ impresoras en una sola operacion.

### 6. Importacion Inteligente de Reportes Excel
- Sube hojas de calculo generadas por personal externo.
- La IA normaliza errores de tipeo en areas e impresoras, mostrando una vista previa comparativa de cambios antes de impactar en la base de datos central.

### 7. Control de Descuento de Repuestos (Stock)
- Descuenta un consumible del inventario con un solo clic.
- Asociacion automatica del repuesto a una impresora del inventario, restaurando su nivel al 100%.
- Registro automatico del reemplazo en la bitacora historica del equipo.

### 8. Persistencia Offline y Sincronizacion
- Persistencia local de IndexedDB habilitada para Firestore.
- Los cambios realizados sin conexion se almacenan en bufer local y se sincronizan automaticamente al recuperar conectividad.
- El parser de texto local permite operaciones basicas de actualizacion sin acceso a internet ni a APIs externas.

### 9. Prediccion de Autonomia de Consumibles
- Algoritmo de desgaste lineal que estima la fecha de agotamiento de cada consumible (Toner, Kit de Mantenimiento, Unidad de Imagen).
- Arquitectura basada en el patron Estrategia para permitir futuros algoritmos avanzados o Machine Learning sin modificar componentes existentes.

### 10. Historial y Auditoria
- Bitacora general de todas las operaciones realizadas sobre impresoras y stock.
- Historial individual por impresora con registro de cada lectura, actualizacion y reemplazo de consumibles.
- Identificacion del proveedor de procesamiento utilizado en cada operacion (Gemini, OpenRouter, OCR Local, Parser Offline).

### 11. Modulo de Facturacion y Cierres Mensuales
- Registro historico de cortes de facturacion recurrentes (Ej. cierres los dias 19 de cada mes).
- Almacenamiento consolidado de metrica "Total Hojas" y "Total Caras" extraidas del inventario por periodo.
- Graficos interactivos de evolucion historica utilizando Recharts, integrados directamente en el Dashboard.

---

## Instalacion y Ejecucion Local

### Prerrequisitos
- Node.js (v18 o superior recomendado)
- npm o yarn

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/aaron-beeker/SAMI-Lexmark.git
cd SAMI-Lexmark
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env.local` en la raiz del proyecto y anade tus credenciales:
```env
# Firebase Firestore
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id

# IA (opcional, se pueden configurar tambien desde la vista de Ajustes)
VITE_GEMINI_API_KEY=tu_api_key_de_gemini
VITE_OPENROUTER_API_KEY=tu_api_key_de_openrouter
```

### 3. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
La aplicacion estara disponible localmente en `http://localhost:5173/` (o el puerto que asigne Vite).

Para usar Vercel CLI:
```bash
vercel dev
```

---

## Construccion para Produccion

Para compilar y minificar la aplicacion para su despliegue:
```bash
npm run build
```
Los archivos optimizados se generaran en el directorio `/dist`.

---

## Despliegue

El proyecto esta configurado para despliegue continuo con Vercel. Cada push a la rama principal despliega automaticamente una nueva version.

---

## Estructura de Datos en Firestore

### Coleccion `impresoras` (documento por numero de serie)
```
id_serie (string)          - Numero de serie unico del equipo
modelo (string)            - Modelo del equipo (MX431ADN, MX632ADWE, MX722ADHE)
area_actual (string)       - Area hospitalaria donde se encuentra
ubicacion_entidad (string) - "Hospital" o "MUR"
ip (string)                - Direccion IP o "USB"
estado_funcionamiento      - "Operativo", "Advertencia" o "Inoperativo"
observaciones (string)     - Notas de fallos mecanicos o fisicos
codigo_caso_cas (string)   - Codigo de caso CAS asignado
detalle_caso (string)      - Detalle del caso CAS
consumibles (map)          - toner_nivel, unidad_imagen_nivel, mantenimiento_kit_nivel, ultima_lectura
prediccion (map)           - Fechas estimadas de agotamiento por consumible
```

### Coleccion `repuestos` (documento por modelo)
```
toner_hospital (number)         - Unidades de toner disponibles en hospital
toner_deposito (number)         - Unidades de toner en deposito
unidad_hospital (number)        - Unidades de imagen en hospital
unidad_deposito (number)        - Unidades de imagen en deposito
mantenimiento_hospital (number) - Kits de mantenimiento en hospital
mantenimiento_deposito (number) - Kits de mantenimiento en deposito
```
