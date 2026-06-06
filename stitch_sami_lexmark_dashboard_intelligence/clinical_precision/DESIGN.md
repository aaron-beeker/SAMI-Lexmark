---
name: Clinical Precision
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fc'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1eb'
  on-surface: '#1a1b22'
  on-surface-variant: '#444653'
  inverse-surface: '#2f3037'
  inverse-on-surface: '#f1f0fa'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#611e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#872d00'
  on-tertiary-container: '#ffa583'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#802a00'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1eb'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1440px
---

## Brand & Style

This design system is built for mission-critical hospital infrastructure. The aesthetic is **Corporate Modern**, prioritizing high legibility, data density, and professional reliability. It avoids unnecessary ornamentation to focus on the immediate communication of hardware status and AI-driven insights.

The interface utilizes a "Clear-View" hierarchy, where functional utility is balanced with a sophisticated, calm atmosphere. The target audience—hospital IT administrators and maintenance staff—requires a UI that minimizes cognitive load while providing deep technical visibility. The emotional response should be one of confidence, efficiency, and clarity.

## Colors

The palette is rooted in a structured corporate blue to instill trust. 
- **Primary:** Used for actionable elements, active states, and brand recognition.
- **Surface & Background:** A light-mode default using Slate and Gray-100 to differentiate the background from white container cards. For the "Dark" components of the dashboard (like sidebars or headers), use Gray-800.
- **Semantic Logic:** These colors are reserved strictly for status communication. Success Green indicates "Ready," Warning Orange for "Low Supplies," and Critical Red for "Paper Jam" or "Offline."

## Typography

The system uses **Inter** for its neutral, highly legible character, essential for reading printer logs and technical IDs. To distinguish technical data (IP addresses, serial numbers, error codes), **JetBrains Mono** is introduced for small labels, providing a distinct "system-data" feel.

- **Headlines:** Use tight letter spacing for a modern, authoritative look.
- **Body:** Standardized at 14px for density in data tables, with 16px for prose and AI chat responses.
- **Data Labels:** Always uppercase when using the monospaced font for status tags.

## Layout & Spacing

The design system utilizes a **Fixed-Fluid Hybrid Grid**. 
- **Desktop:** 12-column grid with a 1440px max-width. Content is centered. Sidebars are fixed at 280px.
- **Tablet:** 8-column grid with 24px margins.
- **Mobile:** 4-column grid with 16px margins.

Spacing follows a strict 4px base unit. Card padding should be consistently 24px (space-6) to ensure data feels breathable despite high information density. Horizontal rhythm in tables should prioritize wide gutters to prevent line-scanning errors.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**. 
- **Level 0 (Background):** Gray-100 (#F3F4F6).
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF) with a very soft, 10% opacity blue-tinted shadow (0px 4px 12px).
- **Level 2 (Modals/Popovers):** Pure White with a more pronounced shadow (0px 12px 24px) to indicate high priority.

Use low-contrast outlines (1px solid Gray-200) on cards to define boundaries in light mode, ensuring the interface feels structural and grounded.

## Shapes

The shape language is **Rounded**, striking a balance between the clinical coldness of a hospital and the modern approachability of an intelligent assistant.
- **Standard Elements (Buttons, Inputs, Cards):** 0.5rem (8px).
- **Large Elements (Dialogs, Chat Container):** 1rem (16px).
- **Status Badges:** Fully rounded (pill) to distinguish them from interactive buttons.

## Components

### Buttons & Inputs
Buttons use the Primary Blue with white text for high contrast. Hover states should darken the blue by 10%. Inputs use a white background with a 1px Gray-300 border, shifting to a 2px Primary Blue border on focus.

### Status Badges
Badges use a "Tonal" style: a 10% opacity background of the semantic color with 100% opacity text of the same color (e.g., Success Green text on a light mint background). This ensures accessibility without overwhelming the eye.

### Modern Cards
Cards are the primary container for printer metrics. They must include a subtle 1px border and the "Level 1" shadow. Headers within cards should use `headline-md`.

### Conversational Interface (Gemini)
The chat interface should be docked or full-height in a sidebar. User bubbles use Primary Blue; AI bubbles use a light Gray-100 to distinguish the source. Use `body-md` for text to maximize message visibility.

### Interactive Tables
Tables should feature "sticky" headers and alternating row highlights (Zebra striping) using Gray-50 for better scanning of long printer lists. Action items (Edit, Restart, Log) should be icon-only or secondary buttons to maintain a clean layout.