# ORIA — Design System

**Memorable thing:** "Control real sobre mi dinero"
**Aesthetic direction:** Instrumento de Precisión — la interfaz es una herramienta manufacturada, no una app de lifestyle. Superficies que se sienten construidas, no pintadas.

---

## Color System

```css
:root {
  /* Fondos */
  --bg:           #0A0C0F;   /* warm near-black — no azul-navy */
  --surface:      #111419;   /* cards, sheets */
  --surface-2:    #1A1E25;   /* inputs, hover states, chips */

  /* Bordes */
  --border:       #1E2530;
  --border-light: #263040;

  /* Texto */
  --text:         #E8E4DC;   /* warm off-white — no #FFF puro */
  --text-sec:     #94A3B8;
  --text-muted:   #6B7280;

  /* Acento principal — verde eléctrico */
  --accent:       #00E5A0;   /* ingresos, éxito, nav activo */
  --accent-dark:  #00B87D;
  --accent-bg:    #002A1F;

  /* Acento secundario — amber */
  --amber:        #F5A623;   /* alertas, ORIA score needle, TRM, CTAs */
  --amber-bg:     #2A1D00;

  /* Semánticos */
  --danger:       #EF4444;   /* gastos, errores */
  --danger-bg:    #1F0808;
  --warning:      #F59E0B;   /* advertencias suaves */
}
```

### Rationale

- **#0A0C0F** en lugar de #081426: el azul-navy de la versión anterior grita "startup 2019". El warm near-black con texto cálido (#E8E4DC) lee "instrumento de precisión".
- **#00E5A0** en lugar de #31D67B: más cian, más eléctrico. Brilla literalmente en AMOLED. Ningún fintech colombiano lo usa.
- **Amber #F5A623** en lugar de azul primario: Bancolombia, Nequi y Daviplata son azules. El amber le da identidad propia a ORIA en cualquier pantalla de inicio. Es un signal color — llama la atención sin agredir.
- Nunca usar gradientes como decoración. El color es raro y significativo.

---

## Typography

| Rol | Font | Peso | Uso |
|-----|------|------|-----|
| Hero / Números | **DM Mono** | 400 (nunca bold) | Todos los montos COP, ORIA Score, sufijos de cuenta |
| UI / Cuerpo | **DM Sans** | 300–700 según jerarquía | Labels, descripciones, navegación, chat |

### Reglas críticas

- **Todo número monetario usa DM Mono** — no solo códigos, sino cada COP en la app. Los montos se sienten grabados, autoritativos.
- El peso en DM Mono viene del espaciado mono, no del font-weight. Usar 400, no 700.
- Nunca usar Inter, Roboto, Poppins, system-ui, ni -apple-system como fuente principal.
- DM Mono y DM Sans son del mismo foundry (Colophon); se sienten como un sistema, no como dos fonts pegados.

### Escala tipográfica

```
Hero networth:   DM Mono 400  32–36px  letter-spacing: -0.02em
ORIA Score:      DM Mono 400  28px
Monto inline:    DM Mono 400  13–15px
Section headers: DM Sans 700  20px
Labels (caps):   DM Sans 500  9–11px   letter-spacing: 0.12em  text-transform: uppercase
Body:            DM Sans 400  13–14px
Meta / fechas:   DM Mono 400  10–11px  color: --text-muted
```

### Google Fonts import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
```

---

## Spacing & Layout

```
Base unit:              8px
Container padding:      20px (horizontal), 16–20px (vertical)
Card gap:               10–12px
Section gap:            24–32px
```

### Jerarquía de layout

1. **Hero zone** (patrimonio neto + ORIA Score): sangra borde a borde, sin card container, sin border-radius. Es un canvas. Background: `linear-gradient(160deg, #0E1620, var(--bg))`.
2. **Cards**: `background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12–16px`.
3. **Rows**: transaction rows tienen altura fija de 56px. Sin variación.

---

## Border Radius

| Elemento | Radius |
|----------|--------|
| Hero zone | 0px — sangra al borde |
| Cards / sheets | **8px** |
| Chips / badges | 6px |
| Icons (avatar-style) | 6–8px |
| Inputs | 8px |
| Botones | 8px |

> La versión anterior usaba 18px en cards. 18px es friendly y suave — va contra "instrumento de precisión". 8px es preciso y profesional.

---

## Navigation (TabBar)

- **5 ítems**: Inicio, Movimientos, + (FAB), Metas/Patrimonio, Perfil
- **Sin labels** — solo íconos de 20px, stroke style (no filled)
- **Estado activo**: borde superior de 2px en `--accent` sobre el ícono. No pill background, no dot.
- **FAB** (botón +): position absolute centrado sobre la tab bar, `background: --accent`, color negro, border-radius: 50%, 48×48px.

---

## Components

### Transaction Row

```
Height: 56px (fijo)
Layout: [icon 32px] [description flex:1] [amount right-aligned]

Icon:    width/height 32px, border-radius 8px, background tonal del color de categoría
Merchant: DM Sans 500 13px, color --text, truncado con ellipsis
Date:    DM Mono 400 10px, color --text-muted, debajo del merchant
Amount:  DM Mono 400 13px, income → --accent, expense → --text (nunca rojo para gastos en lista)
```

> Los gastos en lista usan `--text` (off-white), no rojo. El rojo es para errores y alertas. Solo el color positivo (verde) se destaca en la lista — eso acentúa los ingresos sin hacer los gastos parecer "malos" constantemente.

### ORIA Score — Dial

Reemplaza el `ScoreRing` circular. Implementar como SVG:

```svg
<!-- Arc track -->
<path d="M 10 46 A 30 30 0 0 1 70 46" stroke="var(--surface-2)" stroke-width="5" fill="none" stroke-linecap="round"/>
<!-- Filled arc (score/100 * arco total) -->
<path d="M 10 46 A 30 30 0 0 1 70 46" stroke="var(--accent)" stroke-width="5" fill="none" stroke-linecap="round"
      stroke-dasharray="94.25" stroke-dashoffset="{(1 - score/100) * 94.25}"/>
<!-- Needle: rotates from -90deg (score=0) to +90deg (score=100) -->
<!-- Center: (40,46), pivot point -->
<line x1="40" y1="46" x2="{...}" y2="{...}" stroke="var(--amber)" stroke-width="1.5" stroke-linecap="round"/>
<circle cx="40" cy="46" r="3" fill="var(--amber)"/>
```

Animación: spring physics en la aguja cuando carga (no ease-in-out lineal).

### Account Card

```
background: var(--surface)
border: 1px solid var(--border)
border-radius: 8px
padding: 12px 14px
Layout: [logo 28px] [name + suffix] [balance right]

Logo: 28x28px, border-radius 6px, colores institucionales:
  Bancolombia → bg #0D2B6B, text #7BA8FF, sigla "BC"
  Davivienda  → bg #7A1010, text #FCA5A5, sigla "DV"
  Nequi       → bg #2D004A, text #C084FC, sigla "N"
  Otro        → bg var(--surface-2), text var(--text-muted)

Name:    DM Sans 500 12px, color --text
Suffix:  DM Mono 400 10px, color --text-muted
Balance: DM Mono 400 12px, color --text, text-align right
```

### Feature: Toggle Fecha / Patrón

En TransactionsScreen, agregar un toggle junto al título:

```
Fecha   → orden cronológico inverso (comportamiento actual)
Patrón  → agrupa por comercio, ordena por gasto total descendente
          Rappi: $890.000 (7 txns)
          Netflix: $47.900 (1 txn)
```

El modo Patrón comunica la filosofía del producto: no solo "qué pasó" sino "cómo gasto mi dinero". Es un cambio de sort key — bajo costo de implementación, alto valor de diferenciación.

---

## Motion

```
Principio: solo movimiento que ayuda comprensión. Nada decorativo.

Carga de números:     Counter animation $0 → monto real, 600ms ease-out
Aguja ORIA Score:     Spring physics, stiffness 120 damping 14, delay 200ms tras carga
Sheets / modals:      slide-up 280ms cubic-bezier(0.32, 0.72, 0, 1)
Tab transitions:      fade 150ms ease
Row press:            background flash to --surface-2, 100ms
```

No usar bounce (cubic-bezier elástico) en elementos de datos. Las finanzas deben sentirse precisas, no juguetones.

---

## Anti-patterns (nunca hacer)

- Gradientes como decoración (linear-gradient en botones, en hero)
- Grilla de 3 columnas con íconos en círculos de colores
- Todo centrado con espaciado uniforme
- border-radius uniforme en todos los elementos (hero sangra, cards tienen 8px)
- Botones con gradient como CTA primario
- font-weight 700 en DM Mono
- Texto verde para gastos (reservar verde exclusivamente para ingresos y éxito)
- Usar Inter, Roboto o cualquier font de la lista negra

---

## Implementation Notes

### theme.ts — cambios necesarios

```typescript
export const C = {
  bg: '#0A0C0F', surface: '#111419', surfaceEl: '#1A1E25',
  border: '#1E2530', borderLight: '#263040',
  accent: '#00E5A0', accentDark: '#00B87D', accentBg: '#002A1F',
  amber: '#F5A623', amberBg: '#2A1D00',
  text: '#E8E4DC', textSec: '#94A3B8', textMuted: '#6B7280',
  danger: '#EF4444', dangerBg: '#1F0808',
  warning: '#F59E0B',
  // Eliminar: primary, primaryLight, primaryGlow (reemplazados por amber)
  chart: ['#00E5A0','#F5A623','#4A9EFF','#8B5CF6','#EC4899','#06B6D4','#F97316','#64748B'],
};

export const mono = "'DM Mono', monospace";
export const sans = "'DM Sans', sans-serif";

// Eliminar: gradBlue, gradAccent (no usar gradientes decorativos)
export const gradHero = 'linear-gradient(160deg, #0E1620, #0A0C0F)';
```

### Card style

```typescript
export const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,   // era 18
  padding: 16,
};
```

### Fuentes en index.html

Agregar el `<link>` de Google Fonts en `web/index.html` antes de cualquier otro stylesheet.

---

*Generado por /design-consultation · 23 Jun 2026*
*Fuente de verdad para todos los cambios de UI/UX de ORIA.*
