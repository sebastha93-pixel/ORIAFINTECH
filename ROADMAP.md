# Nexo Finanzas — Roadmap de Desarrollo

## MVP (Fase 1) — 0 a 12 semanas

### Sprint 1-2: Fundamentos
- [x] Arquitectura del monorepo
- [x] Schema de base de datos (Supabase/PostgreSQL)
- [x] Autenticación con Supabase Auth
- [x] API: Auth, Usuarios, Cuentas
- [x] App: Pantallas de Login y Registro
- [x] Sistema de diseño y tema oscuro

### Sprint 3-4: Core Financiero
- [x] API: Módulo de Transacciones con filtros avanzados
- [x] API: Módulo de Patrimonio (Activos + Pasivos)
- [x] API: Dashboard con métricas calculadas
- [x] App: Dashboard principal
- [ ] App: Pantalla de Movimientos con lista y filtros
- [ ] App: Formulario para agregar transacciones

### Sprint 5-6: Patrimonio y Metas
- [x] API: Módulo de Metas con contribuciones
- [ ] App: Pantalla de Patrimonio (Patrimonio Neto)
- [ ] App: Pantalla de Metas con progreso
- [ ] App: Formularios de Activos y Pasivos
- [ ] Historial de patrimonio neto con gráficas

### Sprint 7-8: IA Integration
- [x] API: Módulo de IA (OpenAI GPT-4o)
- [x] API: Generación automática de insights
- [x] App: Pantalla de Chat con Nexo IA
- [ ] Auto-categorización de transacciones con IA
- [ ] Insights proactivos semanales
- [ ] Sugerencias personalizadas por meta

### Sprint 9-10: Polish & Performance
- [ ] Notificaciones push (Expo Notifications)
- [ ] Onboarding flow
- [ ] Perfil y configuración de usuario
- [ ] Optimización de queries (indexes, caching)
- [ ] Tests unitarios y de integración
- [ ] Error handling robusto

### Sprint 11-12: Launch Preparation
- [ ] Beta testing con usuarios reales
- [ ] App Store & Google Play submission
- [ ] Analytics (Amplitude o Mixpanel)
- [ ] Soporte de múltiples monedas
- [ ] Modo offline básico

---

## Fase 2: Crecimiento (Mes 4-6)

### Funcionalidades
- [ ] Importación de extractos bancarios (CSV/PDF)
- [ ] Presupuestos por categoría
- [ ] Reportes mensuales en PDF
- [ ] Comparativas período a período
- [ ] Múltiples perfiles (familia)
- [ ] Widget de patrimonio para home screen

### Integraciones
- [ ] Open Banking API (Belvo, Plaid LatAm)
- [ ] Conexión con bancos colombianos principales
- [ ] Importación de datos de Nequi, Daviplata
- [ ] Google Sheets export

### IA Avanzada
- [ ] Análisis predictivo de gastos
- [ ] Detección de gastos anómalos
- [ ] Alertas de límite de presupuesto
- [ ] Recomendaciones de inversión personalizadas

---

## Fase 3: Expansión (Mes 7-12)

### Mercados
- [ ] México (MXN, SAT integration)
- [ ] Argentina (ARS, inflación adjustments)
- [ ] Brasil (BRL, CPF)
- [ ] Chile (CLP)
- [ ] Perú (PEN)

### Monetización
- [ ] Plan gratuito: 2 cuentas, 3 metas, IA básica
- [ ] Plan Pro ($4.99/mes): Cuentas ilimitadas, IA completa, reportes
- [ ] Plan Premium ($9.99/mes): Conexión bancaria, asesoría, familia

### Producto
- [ ] Versión web (React)
- [ ] API pública para partners
- [ ] Marketplace de asesores financieros
- [ ] Inversiones integradas (fondos, ETFs)

---

## KPIs Clave

| Métrica | Mes 3 | Mes 6 | Mes 12 |
|---------|-------|-------|--------|
| Usuarios activos | 1K | 10K | 100K |
| DAU/MAU | 30% | 35% | 40% |
| Retención 30d | 40% | 50% | 60% |
| NPS | 40 | 55 | 70 |
| MRR (Pro) | $500 | $5K | $50K |

---

## Stack Tecnológico

```
Frontend:    React Native + Expo + TypeScript
Backend:     NestJS + Node.js
Database:    PostgreSQL (Supabase)
Auth:        Supabase Auth (JWT)
AI:          OpenAI GPT-4o + GPT-4o-mini
Storage:     Supabase Storage
CDN:         Cloudflare
Deploy:      EAS (Expo) + Railway/Fly.io (API)
Monitoring:  Sentry + Datadog
```
