# Auditoría del Sistema CiudadAR y Roadmap

Este documento presenta una auditoría técnica del estado actual de la plataforma **CiudadAR**, identificando los componentes desarrollados, áreas de mejora arquitectónica y técnica, y una propuesta formal para las próximas fases de desarrollo.

## Estado Actual: ¿Qué tenemos hasta ahora?

Hemos construido una arquitectura sólida orientada a un MVP robusto y escalable, utilizando tecnologías modernas.

### 1. Stack Tecnológico
*   **Frontend**: React 18, Vite, React Router DOM v7.
*   **Estilos y UI**: Tailwind CSS, Lucide React (iconografía premium), diseño "Glassmorphism" con animaciones dinámicas.
*   **Backend & Base de Datos**: Supabase (PostgreSQL), Auth, Storage y PostGIS para manejo geoespacial.
*   **Mapas**: Leaflet, React Leaflet con Clustering y Heatmaps.
*   **Inteligencia Artificial**: MediaPipe Vision para verificación inicial en el cliente.
*   **PWA**: Vite PWA plugin para soporte instalable en dispositivos móviles.

### 2. Módulos Implementados
*   **Autenticación**: Flujo de login y registro integrado con Supabase Auth y sincronizado con la tabla `profiles` (Roles: ciudadano, oficial).
*   **Dashboard de Mapa Central (`MapDashboard`)**: Mapa interactivo con soporte para capas de Calor (Heatmaps), división por comunas/municipios y clustering de infracciones.
*   **Motor de Reportes (`CreateReport`)**:
    *   Captura de fotos con geolocalización precisa.
    *   Integración con API de Georef (Reverse Geocoding) para obtener la calle/municipio exacto.
    *   Filtro de privacidad (`PrivacyEditor`) para censurar rostros o datos sensibles antes de subir.
    *   Verificación de imagen por IA (MediaPipe) en el cliente.
*   **Base de Datos Geoespacial (`database_schema.sql`)**:
    *   Tablas optimizadas con índices espaciales (GIST).
    *   Triggers automatizados para la creación de "Zonas de Alta Prioridad" (High Priority Zones).
    *   Funciones RPC (`get_infractions_nearby`) para consultas rápidas de radio.
    *   Políticas RLS (Row Level Security) estrictas por rol.
*   **Paneles Secundarios**: Panel de Administración (`AdminPanel`), Historial del usuario (`History`) y Perfil (`UserProfile`).

---

## Oportunidades de Mejora (Deuda Técnica y Optimizaciones)

A pesar del excelente avance, hay puntos críticos que debemos optimizar para garantizar que la plataforma soporte tráfico masivo y no sea vulnerable a manipulaciones:

1.  **Seguridad y Fiabilidad de IA (Crítico)**:
    *   *Actualmente*: La IA (`verifyInfractionWithAI.js`) corre del lado del cliente. Un usuario malintencionado podría bypassear el frontend y enviar reportes falsos directamente a Supabase.
    *   *Mejora*: Migrar la verificación de imágenes (idealmente usando Google Gemini Vision como se planteó en pruebas anteriores) a **Supabase Edge Functions**. Así, la imagen se valida de forma segura en el servidor.
2.  **Rendimiento en Mapas de Alta Densidad**:
    *   *Actualmente*: React Leaflet Cluster agrupa marcadores en el navegador. Con >10,000 reportes, el DOM se ralentizará.
    *   *Mejora*: Implementar clustering a nivel de base de datos (PostGIS `ST_ClusterDBSCAN` o `ST_ClusterKMeans`) o usar Vector Tiles para que el mapa vuele sin importar la cantidad de datos.
3.  **Resiliencia Offline (PWA)**:
    *   *Actualmente*: Si un agente en la calle se queda sin 4G al enviar el reporte, podría perder el progreso.
    *   *Mejora*: Implementar Background Sync y almacenar los reportes temporalmente en IndexedDB para enviarlos apenas recupere la conexión.
4.  **Testing y QA**:
    *   Carecemos de una suite de pruebas automatizadas, lo cual hace riesgosas las actualizaciones grandes.

---

## Propuesta de Fases Siguientes (Roadmap)

Propongo dividir el trabajo restante en 3 fases lógicas, priorizando la seguridad y escalabilidad antes de añadir más funcionalidades.

### Fase 1: Estabilización y Seguridad (Backend & Edge)
*Objetivo: Hacer la plataforma invulnerable y robusta.*
*   Migrar la IA de validación visual a **Supabase Edge Functions** integrando la API de Google Gemini Vision.
*   Mejorar la lógica "Offline First" de la PWA guardando actas en la cola local si falla la red.
*   Implementar un sistema de caché o clustering en el backend (PostGIS) para el mapa público.
*   Revisión final de políticas RLS y rate-limiting (límite de peticiones por IP).

### Fase 2: Analítica y Panel de Control Oficial
*Objetivo: Darle valor a los entes gubernamentales.*
*   **Completado**: Dashboard interactivo con Recharts.
*   **Completado**: Exportación de reportes a CSV.
*   **Completado**: Sistema de Notificaciones Push internas.

### Fase 2.1: Control Zonal y Jurisdicciones
*Objetivo: Escalar el control a nivel federal/municipal.*
*   **Completado**: Columna `jurisdiction` en perfiles para asignar oficiales a zonas específicas.
*   **Completado**: Filtrado automático en SQL (RPC & RLS) para que los oficiales solo gestionen su zona.
*   **Completado**: Enriquecimiento de reportes con municipio/provincia vía Reverse Geocoding.

### Fase 3: Expansión y Fidelización Ciudadana
*Objetivo: Fomentar el uso y preparar la escalabilidad nacional.*
*   Implementar un sistema de gamificación (Puntos, niveles o medallas) para los ciudadanos con más reportes verificados y útiles.
*   Integración mediante API REST/Webhooks con sistemas de multas reales de municipalidades piloto.
*   Implementar pruebas automatizadas End-to-End (E2E) y configurar un pipeline de CI/CD (GitHub Actions) antes del lanzamiento oficial.

> [!IMPORTANT]
> **Revisión del Usuario Requerida**
> Por favor, revisa el plan. ¿Estás de acuerdo con el orden de prioridades propuesto? Si lo deseas, podemos comenzar inmediatamente con la **Fase 1**, enfocándonos en la migración de la IA a Supabase Edge Functions para robustecer la seguridad del sistema.
