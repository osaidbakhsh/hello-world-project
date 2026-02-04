# Air-Gap Deployment Checklist

This checklist identifies all external dependencies that must be vendored for offline/air-gapped deployment.

## ✅ Current Status Summary

| Category | Status | Notes |
|----------|--------|-------|
| NPM Packages | ✅ Ready | All bundled via Vite |
| External Fonts | ✅ Safe | Uses system fonts only |
| CDN Resources | ✅ None | No external CDN references |
| Icons | ✅ Bundled | Lucide icons bundled with npm |
| External APIs | ⚠️ Requires Config | Backend URL configuration |

---

## 1. NPM Dependencies (Vendor Required)

All packages from `package.json` must be cached in a local npm registry or vendored:

### Production Dependencies (40+ packages)

```bash
# Core Framework
react@^18.3.1
react-dom@^18.3.1
react-router-dom@^6.30.1

# State Management
@tanstack/react-query@^5.83.0

# UI Components (Radix UI - 22 packages)
@radix-ui/react-accordion@^1.2.11
@radix-ui/react-alert-dialog@^1.1.14
@radix-ui/react-aspect-ratio@^1.1.7
@radix-ui/react-avatar@^1.1.10
@radix-ui/react-checkbox@^1.3.2
@radix-ui/react-collapsible@^1.1.11
@radix-ui/react-context-menu@^2.2.15
@radix-ui/react-dialog@^1.1.14
@radix-ui/react-dropdown-menu@^2.1.15
@radix-ui/react-hover-card@^1.1.14
@radix-ui/react-label@^2.1.7
@radix-ui/react-menubar@^1.1.15
@radix-ui/react-navigation-menu@^1.2.13
@radix-ui/react-popover@^1.1.14
@radix-ui/react-progress@^1.1.7
@radix-ui/react-radio-group@^1.3.7
@radix-ui/react-scroll-area@^1.2.9
@radix-ui/react-select@^2.2.5
@radix-ui/react-separator@^1.1.7
@radix-ui/react-slider@^1.3.5
@radix-ui/react-slot@^1.2.3
@radix-ui/react-switch@^1.2.5
@radix-ui/react-tabs@^1.1.12
@radix-ui/react-toast@^1.2.14
@radix-ui/react-toggle@^1.1.9
@radix-ui/react-toggle-group@^1.1.10
@radix-ui/react-tooltip@^1.2.7

# Form Handling
react-hook-form@^7.61.1
@hookform/resolvers@^3.10.0
zod@^3.25.76

# Styling
tailwind-merge@^2.6.0
tailwindcss-animate@^1.0.7
class-variance-authority@^0.7.1
clsx@^2.1.1

# Icons
lucide-react@^0.462.0

# Date/Time
date-fns@^3.6.0
react-day-picker@^8.10.1

# Charts
recharts@^2.15.4

# Data Export
jspdf@^4.0.0
jspdf-autotable@^5.0.7
xlsx@^0.18.5

# Utilities
qrcode@^1.5.4
bcryptjs@^3.0.3
marked@^17.0.1
sql-formatter@^15.7.0

# Backend
@supabase/supabase-js@^2.93.3

# UI Extras
cmdk@^1.1.1
embla-carousel-react@^8.6.0
input-otp@^1.4.2
next-themes@^0.3.0
react-resizable-panels@^2.1.9
sonner@^1.7.4
vaul@^0.9.9
```

### Development Dependencies (17 packages)

```bash
# Build Tools
vite@^5.4.19
@vitejs/plugin-react-swc@^3.11.0
typescript@^5.8.3

# CSS Processing
tailwindcss@^3.4.17
postcss@^8.5.6
autoprefixer@^10.4.21
@tailwindcss/typography@^0.5.16

# Linting
eslint@^9.32.0
@eslint/js@^9.32.0
eslint-plugin-react-hooks@^5.2.0
eslint-plugin-react-refresh@^0.4.20
typescript-eslint@^8.38.0

# Testing
vitest@^3.2.4
@testing-library/jest-dom@^6.6.0
@testing-library/react@^16.0.0
jsdom@^20.0.3

# Types
@types/node@^22.16.5
@types/react@^18.3.23
@types/react-dom@^18.3.7
@types/bcryptjs@^2.4.6
@types/qrcode@^1.5.6

# Misc
globals@^15.15.0
lovable-tagger@^1.1.13
```

---

## 2. Fonts

### Current Configuration ✅
The app uses **system fonts only** - no external font loading:

```css
/* From src/index.css */
font-family: 'Inter', 'Segoe UI', 'Cairo', sans-serif;
```

These are fallback to system fonts. For consistent typography in air-gap:

**Optional Enhancement:**
1. Download Inter font: https://fonts.google.com/specimen/Inter
2. Download Cairo font: https://fonts.google.com/specimen/Cairo
3. Add to `public/fonts/` directory
4. Add `@font-face` declarations to `src/index.css`

---

## 3. External API Endpoints

### Backend Configuration Required

| Endpoint | Current Source | Air-Gap Action |
|----------|---------------|----------------|
| Supabase API | Cloud (Lovable Cloud) | Deploy local PostgreSQL + PostgREST |
| Auth Endpoint | Cloud | Deploy local GoTrue or custom auth |
| Edge Functions | Cloud | Deploy as local Deno functions |

### Environment Variables to Update

```env
# Replace with local infrastructure
VITE_SUPABASE_URL=https://your-local-postgrest.local
VITE_SUPABASE_PUBLISHABLE_KEY=your-local-anon-key
```

---

## 4. Build Artifacts

### Production Build Output
```bash
npm run build
# Output: dist/
```

### Files to Deploy
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js      # Main bundle (~2MB gzipped)
│   ├── index-[hash].css     # Styles (~50KB gzipped)
│   └── *.svg, *.jpg         # Static assets
└── favicon.ico
```

---

## 5. Pre-Deployment Checklist

### Phase 1: Development (Current)
- [x] All npm packages use semantic versioning
- [x] No external CDN references in source code
- [x] System fonts used (no Google Fonts loading)
- [x] Icons bundled via lucide-react npm package
- [x] Build output is self-contained

### Phase 2: Pre-Air-Gap Preparation
- [ ] Run `npm pack` on all dependencies
- [ ] Set up local npm registry (Verdaccio/Artifactory)
- [ ] Upload all packages to local registry
- [ ] (Optional) Download and vendor web fonts
- [ ] Configure local PostgREST/PostgreSQL
- [ ] Deploy Edge Functions locally (Deno)
- [ ] Update environment variables

### Phase 3: Air-Gap Deployment
- [ ] Verify npm install from local registry
- [ ] Run production build
- [ ] Deploy to local web server (nginx/Apache)
- [ ] Configure reverse proxy for API
- [ ] Test all functionality offline

---

## 6. Vendoring Commands

### Export Package Dependencies
```bash
# Create tarball of all node_modules
npm pack --pack-destination ./vendor/

# Or use npm-pack-all for all dependencies
npx npm-pack-all
```

### Set Up Local Registry
```bash
# Using Verdaccio
npm install -g verdaccio
verdaccio

# Configure npm to use local registry
npm config set registry http://localhost:4873
```

### Offline Build
```bash
# With local registry configured
npm ci --offline
npm run build
```

---

## 7. Runtime Dependencies (Backend)

For full air-gap operation, the backend requires:

| Component | Purpose | Local Alternative |
|-----------|---------|-------------------|
| PostgreSQL | Database | Deploy PostgreSQL 15+ |
| PostgREST | REST API | Deploy PostgREST binary |
| GoTrue | Authentication | Deploy GoTrue or custom auth |
| Deno | Edge Functions | Deploy Deno runtime |
| S3-compatible | Storage | MinIO or local storage |

---

## Notes

- **No Runtime CDN Dependencies**: All JavaScript/CSS bundled at build time
- **Images**: All images in `public/` and `src/assets/` are included in build
- **Encryption**: bcryptjs bundled (no external crypto services)
- **QR Codes**: qrcode library bundled (no external API)
- **PDF Generation**: jspdf bundled (no cloud services)

Last Updated: 2026-02-04
