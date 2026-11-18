# TallerApp - Gestión Integral de Talleres Mecánicos

> Solución móvil y web multiplataforma, offline-first, diseñada para optimizar y digitalizar el flujo operativo, control de vehículos y órdenes de servicio en talleres automotrices independientes y centros de mantenimiento.

---

## Problema que Resuelve

La administración en talleres mecánicos independientes suele basarse en notas en papel, boletas físicas o planillas de cálculo desconectadas. Este esquema genera problemáticas recurrentes:

- **Desorganización y pérdida de historial:** Dificultad para rastrear las reparaciones previas, kilometraje y repuestos instalados en cada vehículo.
- **Falta de visibilidad operativa:** Incertidumbre sobre el estado real de los autos en bahía (cuántos están en espera, en proceso de reparación o listos para entrega).
- **Comunicación lenta con el cliente:** Pérdida de tiempo localizando datos de contacto o detalles de presupuesto.
- **Vulnerabilidad de la información:** Riesgo de pérdida definitiva de datos ante fallos del dispositivo o falta de copias de seguridad accesibles.

**TallerApp** resuelve estas fricciones centralizando la gestión diaria en una herramienta intuitiva y rápida. Con un enfoque **offline-first**, permite registrar recepciones, gestionar clientes, controlar órdenes de trabajo y calcular presupuestos en tiempo real sin depender de conexión permanente a internet, integrando además copias de seguridad seguras en la nube.

---

## Funcionalidades Principales

###  Tablero de Control (Dashboard)
- Indicadores en tiempo real de vehículos actualmente en bahía y órdenes abiertas.
- Lista dinámica de vehículos activos con estado visual.
- Acceso rápido a los últimos servicios realizados y atajo directo para recepción de unidades.

### Gestión de Vehículos y Ficha Histórica
- Registro detallado de flota: placa, marca, modelo, año, color, kilometraje y número de serie (VIN/chasis).
- Ficha clínica por vehículo con historial completo de servicios y trazabilidad de mantenimientos.
- Búsqueda y filtrado dinámico por placa o información vehicular.

###  Control de Órdenes de Servicio
- Ciclo de vida completo por estados: `Recibido`, `En Proceso`, `Listo` y `Entregado`.
- Asignación de mecánico o técnico responsable por trabajo.
- Detalle del diagnóstico inicial, trabajo realizado y desglose de repuestos.
- Manejo de presupuesto proyectado vs. costo total final.

### Directorio de Clientes
- Registro y edición de clientes (nombre, teléfono, correo, dirección y notas).
- Vinculación directa cliente-vehículo(s).
- Acciones rápidas de contacto: llamada telefónica, mensajería WhatsApp y correo electrónico con un solo toque.

### Recepción Rápida de Vehículos
- Modal de ingreso ágil que permite registrar o asociar al cliente, ingresar el vehículo y crear la orden de servicio inicial en un único flujo de trabajo continuo.

### Respaldo y Restauración en la Nube
- Exportación estructurada (JSON) de toda la base de datos local.
- Integración con **Google Sign-In** y **Google Drive API** para almacenar copias de seguridad de forma segura en la nube personal del usuario y restaurarlas cuando sea necesario.

### Configuración y Multi-técnico
- Personalización de los datos del taller (nombre comercial, NIT/RUT, teléfono, correo, dirección).
- Catálogo de mecánicos activos en el establecimiento.

### Interfaz Ergonómica y Soporte Multiplataforma
- Soporte nativo para modo oscuro (*Dark Mode*) y claro (*Light Mode*), optimizado para visibilidad en ambientes de taller.
- Interfaz reactiva adaptable a dispositivos móviles (Android / iOS) y navegadores web.

---

## Tecnologías Usadas

| Categoría | Tecnologías / Librerías |
| :--- | :--- |
| **Framework Base** | [React Native 0.88](https://reactnative.dev/) & [React 19](https://react.dev/) |
| **Plataforma & Tooling** | [Expo SDK 58](https://expo.dev/) (Managed Workflow / Bare Compatible) |
| **Enrutamiento y Navegación** | [Expo Router v58](https://docs.expo.dev/router/introduction/) (File-based Routing) & React Navigation |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) (Tipado estricto end-to-end) |
| **Persistencia Local (Offline)** | [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) con WAL Mode y claves foráneas activas |
| **Almacenamiento Clave-Valor** | [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) |
| **Criptografía & Archivos** | `expo-crypto` (generación de UUIDs v4), `expo-file-system`, `expo-sharing` |
| **Nube & Autenticación** | [@react-native-google-signin/google-signin](https://github.com/react-native-google-signin/google-signin), Google Drive API REST v3 |
| **UI & Iconografía** | `@expo/vector-icons` (MaterialIcons), React Native Reanimated, React Native Safe Area Context |
| **Calidad de Código** | ESLint 9 con `eslint-config-expo`, TypeScript Compiler (`tsc`) |

---

## Estructura del Proyecto

```text
TallerApp/
├── src/
│   ├── app/                  # Rutas y vistas de Expo Router
│   │   ├── _layout.tsx       # Navegador raíz y configuración de temas
│   │   ├── index.tsx         # Pantalla principal contenedora de navegación por pestañas
│   │   └── explore.tsx       # Vista auxiliar / exploratoria
│   ├── screens/              # Pantallas del módulo de taller
│   │   ├── TableroScreen.tsx        # Dashboard con métricas y autos activos
│   │   ├── VehiculosScreen.tsx      # Catálogo y filtro de vehículos
│   │   ├── VehiculoFichaScreen.tsx  # Ficha clínica e historial del vehículo
│   │   ├── ServiciosScreen.tsx      # Gestión de órdenes de servicio
│   │   └── ClientesScreen.tsx       # Directorio de clientes y accesos directos
│   ├── components/           # Componentes modales y elementos UI reutilizables
│   │   ├── RecibirVehiculoModal.tsx # Flujo de ingreso rápido
│   │   ├── EditarOrdenModal.tsx     # Edición y cambio de estado de servicios
│   │   ├── ConfiguracionModal.tsx   # Perfil del taller y copias de seguridad
│   │   └── ...                      # Modales de clientes, vehículos y navegación
│   ├── database/             # Capa de datos relacional y persistencia
│   │   ├── schema.ts         # Definición de tablas SQLite y tipos de entidades
│   │   ├── index.ts          # Repositorios (clientes, vehiculos, ordenes, taller)
│   │   └── backup.ts         # Motor de exportación e importación JSON
│   ├── services/             # Integraciones externas (Google Drive, Auth)
│   ├── constants/            # Paleta de colores, tipografía y temas
│   └── types/                # Interfaces TypeScript del dominio
├── app.json                  # Configuración de Expo y metadatos nativos
└── package.json              # Dependencias y scripts del proyecto
```

---

## Instalación y Puesta en Marcha

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 20+ o superior recomendada).
- Gestor de paquetes: `npm`, `yarn`, `pnpm` o `bun`.
- Dispositivo móvil con [Expo Go](https://expo.dev/go) o emulador configurado (Android Studio / Xcode).

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd TallerApp
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npx expo start
   ```

4. **Ejecutar en la plataforma deseada:**
   - Presiona `a` en la terminal para abrir en emulador/dispositivo **Android**.
   - Presiona `i` para simulador **iOS**.
   - Presiona `w` para ejecutar la versión **Web**.
   - Escanea el código QR desde la app **Expo Go** (Android) o Cámara (iOS).

### Scripts Disponibles

- `npm run start`: Inicia el servidor de desarrollo Expo.
- `npm run android`: Inicia la aplicación directamente en Android.
- `npm run ios`: Inicia la aplicación en el simulador de iOS.
- `npm run web`: Inicia la aplicación para navegador web.
- `npm run lint`: Ejecuta el análisis estático con ESLint.
- `npx tsc --noEmit`: Verifica la integridad de tipos con TypeScript.

---

## Licencia

Este proyecto es de uso privado y confidencial para la gestión de talleres automotrices.
