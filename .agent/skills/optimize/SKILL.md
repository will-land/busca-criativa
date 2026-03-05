---
name: optimize
description: Use when the user wants to optimize performance, improve PageSpeed score, check if the site is optimized, or before deploying to production. Covers loading (images, CSS, fonts, scripts, resource hints) AND runtime (animations, RAF, scroll). Sections ordered from most common to most specific.
---

# Skill: Optimize

Referência rápida para otimizações de performance.

**Metas:**
- PageSpeed: **90+** (Desktop e Mobile)
- Runtime: **60 FPS**
- CLS: **< 0.1**
- TBT: **< 200ms**
- LCP: **< 2.5s**

Para instruções detalhadas, use o workflow `/otimizar`.

---

# AUDITORIA PRIMEIRO (OBRIGATÓRIO)

**NUNCA corrija antes de auditar.** Leia TODOS os arquivos e liste TODOS os problemas.

## Checklist de Auditoria

Para CADA `<img>`:
- [ ] Usa CDN? width numérico? height numérico? loading correto?

Para CADA `<script>`:
- [ ] Tem defer/async? É minificado? Pode ser removido?
- [ ] **Está linkado no HTML mas deveria ser Dynamic Import?**

Para CADA `import` estático no JS:
- [ ] Biblioteca pesada? (Three.js, GSAP, etc.) Usar Dynamic Import!

Para CADA biblioteca:
- [ ] CSS E JS podem ser removidos? (ambos, não só um)

Hero/LCP:
- [ ] opacity:0? data-aos? animação entrada? transform inicial?
- [ ] Hero container tem min-height fixo?

Fonts:
- [ ] Quantos weights? (máx 3) display=swap? Carregamento bloqueante?

AOS/Animações:
- [ ] Injeta classes no body/html? (PROIBIDO - causa CLS)

Runtime (se houver animações):
- [ ] Quantos RAF loops? (deve ser 1) Throttle no scroll?

Three.js (se houver):
- [ ] GLB > 500KB? Usa Draco? .min.js? Luzes? (máx 3)
- [ ] Usa import estático? (ERRADO - usar Dynamic Import)

**Apresente relatório completo antes de corrigir.**

---

# ERROS CRÍTICOS DESCOBERTOS

## 0. Script no Caminho Crítico (ARMADILHA SUTIL)

Mesmo com Dynamic Import no JS, o script pode aparecer na cadeia crítica se estiver linkado no HTML:

```html
<!-- ERRADO - módulo pesado está no HTML = caminho crítico -->
<script src="/script.js" defer></script>
<script src="/module-3d.js" defer></script>  <!-- PROBLEMA! -->
```

```html
<!-- CORRETO - módulo pesado SÓ carrega via Dynamic Import -->
<script src="/script.js" defer></script>
<!-- Nenhuma referência ao módulo pesado aqui! -->
```

```javascript
// script.js - Carrega módulo APENAS após interação
onFirstInteraction(async () => {
  const { init3D } = await import('./module-3d.js');
  init3D();
});
```

**Verificação:** No DevTools Network, módulos pesados NÃO devem aparecer até a primeira interação.

## 1. Falso Deferimento (ARMADILHA)

```javascript
// ERRADO - import estático no topo SEMPRE baixa imediatamente
import * as THREE from 'three';

setTimeout(() => {
  // Não importa o delay - THREE já foi baixado no início!
  initScene();
}, 5000);
```

```javascript
// CORRETO - Dynamic Import só baixa quando chamado
async function initScene() {
  const THREE = await import('three');
  // Agora sim, só baixa quando a função é chamada
}
```

**Regra:** Bibliotecas pesadas (Three.js, GSAP, etc.) DEVEM usar Dynamic Import.

## 2. Body Shifting (CLS Destroyer) - CLS 0.7+

O CLS alto no `<body>` tem múltiplas causas:

```javascript
// CAUSA 1: AOS injeta classes na tag <body>
AOS.init(); // Adiciona data-aos-easing, data-aos-duration no body
// Isso empurra TODO o layout = CLS 0.7+
```

```css
/* CAUSA 2: Fontes carregando causam reflow */
body {
  font-family: 'CustomFont', sans-serif;
  /* Quando a fonte carrega, TODO o texto reflui */
}

/* SOLUÇÃO: Reservar espaço com font-display e métricas */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}

/* OU: Aplicar fonte só após carregamento */
body { font-family: system-ui, sans-serif; }
body.fonts-loaded { font-family: 'CustomFont', sans-serif; }
```

```css
/* CAUSA 3: Elementos do hero sem dimensões fixas */
.hero-content {
  /* ERRADO - altura depende do conteúdo */
}

/* CORRETO - Dimensões fixas */
.hero-content {
  min-height: 400px; /* Ou altura calculada */
  contain: layout paint;
}
```

```css
/* CAUSA 4: Botões/elementos com transform inicial */
.btn {
  transform: translateY(20px); /* CAUSA CLS quando anima para 0 */
  opacity: 0;
}

/* CORRETO - Sem transform/opacity inicial no hero */
.hero .btn {
  transform: none;
  opacity: 1;
}
```

**Regras:**
- NUNCA permitir que bibliotecas toquem no `<body>` ou `<html>`
- Elementos do hero DEVEM ter dimensões fixas
- Botões/CTAs no hero: SEM animação de entrada
- Fontes: usar font-display: swap + classe .fonts-loaded

## 3. Main Thread Jam (TBT Killer)

```javascript
// ERRADO - Tudo inicia junto
window.onload = () => {
  initParticles();   // Pesado
  init3D();          // Pesado
  loadFonts();       // Pesado
  // = travamento em mobile
};
```

```javascript
// CORRETO - Escalonar com Interaction Trigger
onFirstInteraction(async () => {
  const { initParticles } = await import('./particles.js');
  initParticles();
});

onFirstInteraction(async () => {
  const THREE = await import('three');
  init3DScene(THREE);
});
```

## 4. LCP Oculto (Score Killer)

```css
/* ERRADO - Google considera o site "vazio" */
.hero-title {
  opacity: 0;
  animation: fadeIn 0.5s ease forwards;
}
```

```css
/* CORRETO - Visível no primeiro frame */
.hero-title {
  opacity: 1; /* Nada de animação de entrada no Hero! */
}
```

---

# REGRAS DE CORREÇÃO

1. **Exaustivo**: Corrigir TODAS as imagens, não apenas algumas
2. **Completo**: Remover biblioteca = remover CSS + JS + código dependente
3. **Numérico**: width/height SEMPRE números (NUNCA "auto" ou "100%")
4. **Verificar**: Após corrigir categoria, confirmar que TODOS itens foram feitos
5. **Dynamic Import**: Bibliotecas pesadas (>100KB) DEVEM usar import dinâmico
6. **Manter funcionalidade**: NUNCA desabilitar recursos - otimizar para que funcionem

---

# PADRÃO: INTERACTION TRIGGER (Smart Hydration)

Recursos pesados só carregam após interação humana, mantendo funcionalidade completa:

```javascript
// utility: onFirstInteraction
let interacted = false;
const callbacks = [];

function onFirstInteraction(callback) {
  if (interacted) {
    callback();
    return;
  }
  callbacks.push(callback);
}

['scroll', 'touchstart', 'click', 'keydown'].forEach(event => {
  window.addEventListener(event, () => {
    if (interacted) return;
    interacted = true;
    callbacks.forEach(cb => cb());
  }, { once: true, passive: true });
});

// Fallback: 8 segundos se não houver interação
setTimeout(() => {
  if (!interacted) {
    interacted = true;
    callbacks.forEach(cb => cb());
  }
}, 8000);

// USO:
onFirstInteraction(async () => {
  const { initParticles } = await import('./particles.js');
  initParticles();
});

onFirstInteraction(async () => {
  const THREE = await import('three');
  init3DScene(THREE);
});
```

**Usar para:** Three.js, Partículas, Chat widgets, Analytics, Pixels, GSAP pesado.

---

# OTIMIZAÇÃO MOBILE (Manter Funcionalidade)

**NUNCA desabilitar recursos em mobile.** Otimizar para que funcionem:

```javascript
const isMobile = window.innerWidth < 768;

// Three.js otimizado para mobile
const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,  // Desliga antialias (não o 3D)
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));

// Partículas otimizadas para mobile
const particleCount = isMobile ? 25 : 40;  // Menos partículas (não zero)

// Animações otimizadas para mobile
if (isMobile) {
  // Simplificar complexidade, não desabilitar
}
```

---

# ESSENCIAL (Toda Landing Page)

## 1. Imagens

```html
<!-- ERRADO -->
<img src="..." width="600" height="auto">

<!-- CORRETO -->
<img
  src="/.netlify/images?url=/images/foto.jpg&w=600&q=80"
  width="600"
  height="400"
  loading="lazy"
>
```

- [ ] Netlify CDN com `q=80`
- [ ] **width + height NUMÉRICOS**
- [ ] Hero: `loading="eager"` + `fetchpriority="high"`
- [ ] Demais: `loading="lazy"`
- [ ] Imagens grandes com `srcset`

## 2. Resource Hints

```html
<head>
  <!-- Preconnect críticos -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- DNS Prefetch secundários -->
  <link rel="dns-prefetch" href="//www.google-analytics.com">

  <!-- Preload LCP -->
  <link rel="preload" href="/.netlify/images?url=/images/hero.jpg&w=1200&q=80" as="image">
</head>
```

## 3. Fontes (CRÍTICO)

```html
<!-- ERRADO - Bloqueante -->
<link href="https://fonts.googleapis.com/css2?family=Font:wght@400;700&display=swap" rel="stylesheet">

<!-- CORRETO - Assíncrono -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Font:wght@400;700&display=swap"
      rel="stylesheet" media="print" onload="this.media='all'">
<noscript>
  <link href="https://fonts.googleapis.com/css2?family=Font:wght@400;700&display=swap" rel="stylesheet">
</noscript>
```

**Ideal:** Self-host fontes WOFF2 no projeto (elimina dependência de CDN externo).

- [ ] **Max 2-3 weights**
- [ ] `display=swap`
- [ ] Carregamento assíncrono OU self-hosted

## 4. CSS

```html
<!-- Async loading -->
<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/style.css"></noscript>
```

```css
/* CSS Containment para estabilidade de layout */
.section {
  contain: layout paint;
}

/* Dimensões fixas para elementos dinâmicos */
.card {
  min-height: 320px; /* Evita pulos de layout */
}
```

- [ ] Critical CSS inline
- [ ] CSS externo async
- [ ] Remover CSS não usado
- [ ] `contain: layout paint` em seções

## 5. Hero (LCP) - CRÍTICO

- [ ] **SEM animação de ENTRADA**
- [ ] **SEM `opacity: 0` inicial**
- [ ] **SEM `data-aos`**
- [ ] **SEM `transform` inicial** (scale, translate)
- [ ] Texto visível no PRIMEIRO frame
- [ ] Container com min-height fixo

## 6. Scripts

```html
<script src="/script.js" defer></script>
```

- jQuery → Vanilla JS
- Swiper → CSS puro
- Moment.js → Intl API

- [ ] Scripts com `defer`
- [ ] Bibliotecas mínimas
- [ ] **Dynamic Import para pesados**
- [ ] **Módulos pesados NÃO linkados no HTML**

## 7. Third-Party (Analytics, Pixels)

```javascript
// Carregar após interação
onFirstInteraction(() => {
  loadAnalytics();
  loadPixels();
});
```

- [ ] Interaction Trigger
- [ ] DNS-prefetch

## 8. Vídeos

```html
<video poster="poster.jpg" preload="none">
  <source src="video.webm" type="video/webm">
</video>
```

## 9. Iframes

```html
<iframe src="..." loading="lazy"></iframe>
```

- [ ] `loading="lazy"`
- [ ] Facade pattern para YouTube

## 10. SVGs

- [ ] Inline para ícones < 1KB
- [ ] Arquivo com width/height para maiores
- [ ] Otimizar com SVGO

## 11. Content-Visibility

```css
.section-below-fold {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```

## 12. Acessibilidade

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# CONDICIONAL (Se Houver)

## 13. AOS / Bibliotecas de Animação

```javascript
// ERRADO
AOS.init();

// CORRETO - Escopo limitado, sem tocar no body
AOS.init({
  disableMutationObserver: true,
  once: true
});

// MELHOR - Iniciar após interação
onFirstInteraction(() => {
  AOS.init({ once: true, disableMutationObserver: true });
});
```

**Regras:**
- [ ] NUNCA permitir que AOS toque no `<body>` ou `<html>`
- [ ] Usar `once: true` para animar apenas uma vez
- [ ] `disableMutationObserver: true` sempre

## 14. Animações JS

```javascript
// Throttle
let scheduled = false;
addEventListener('scroll', () => {
  if (!scheduled) {
    requestAnimationFrame(() => { update(); scheduled = false; });
    scheduled = true;
  }
}, { passive: true });
```

- [ ] Scroll throttle RAF
- [ ] Único RAF loop
- [ ] Pausar off-screen
- [ ] Pausar tab inativa

## 15. Animações CSS

```css
/* will-change APENAS em animações contínuas (ticker, loading) */
.ticker { will-change: transform; }

/* NUNCA em estados hover ou animações únicas */
```

## 16. Canvas / Partículas

```javascript
// Carregar via Interaction Trigger + Dynamic Import
onFirstInteraction(async () => {
  const { initParticles } = await import('./particles.js');
  const isMobile = window.innerWidth < 768;
  initParticles({ count: isMobile ? 25 : 40 }); // Otimizado, não desabilitado
});
```

- [ ] Dynamic Import
- [ ] Interaction Trigger
- [ ] Sem `shadowBlur`
- [ ] Quantidade adaptativa (menos em mobile, não zero)

## 17. Three.js (CRÍTICO)

```javascript
// CORRETO - Dynamic Import + Interaction Trigger
onFirstInteraction(async () => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');

  initScene(THREE, GLTFLoader, DRACOLoader);
});

function initScene(THREE, GLTFLoader, DRACOLoader) {
  const isMobile = window.innerWidth < 768;

  // Renderer otimizado (funciona em todos dispositivos)
  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));

  // Draco para modelos pesados
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  // Max 3 luzes!
}
```

**Checklist Three.js:**
- [ ] **Dynamic Import** (NUNCA import estático)
- [ ] **Interaction Trigger** (só carrega após scroll/touch)
- [ ] **Módulo NÃO linkado no HTML**
- [ ] GLB com Draco (se > 500KB)
- [ ] Max 3 luzes
- [ ] Antialias OFF em mobile (qualidade, não funcionalidade)
- [ ] Pixel ratio 1 em mobile

---

# CHECKLIST RÁPIDO

## Crítico (Score 90+)
- [ ] Hero: sem opacity:0, sem data-aos, sem animação entrada
- [ ] Hero: container com min-height fixo
- [ ] Imagens: CDN, width/height numérico
- [ ] Scripts pesados: Dynamic Import + Interaction Trigger
- [ ] Scripts pesados: NÃO linkados no HTML
- [ ] Fontes: assíncronas ou self-hosted
- [ ] CSS: async + contain: layout paint

## Essencial
- [ ] Resource hints: preconnect, dns-prefetch, preload
- [ ] Scripts: defer
- [ ] Third-party: Interaction Trigger
- [ ] content-visibility em seções

## Condicional
- [ ] AOS: `disableMutationObserver: true`, `once: true`
- [ ] Three.js: Dynamic Import, max 3 luzes, Draco
- [ ] Partículas: Dynamic Import, quantidade adaptativa

---

# PROBLEMAS COMUNS

- CLS 0.7+ no body → AOS injetando classes → `disableMutationObserver: true`
- CLS alto → height="auto" → height NUMÉRICO + contain: layout paint
- CLS no hero → Fontes causando reflow → font-display: swap + classe .fonts-loaded
- CLS no hero → Container sem altura fixa → min-height no container
- CLS botões → transform/opacity inicial → Remover animação de entrada no hero
- LCP alto → opacity:0 no hero → Hero visível no primeiro frame
- LCP alto → imagem sem preload → preload hero + CDN
- TBT alto → import estático de libs pesadas → Dynamic Import + Interaction Trigger
- Script no caminho crítico → `<script src="modulo.js">` no HTML → Remover do HTML, usar só Dynamic Import
- FCP alto → CSS/Fonts bloqueantes → media="print" onload
- Score inconsistente → Recursos carregam antes da interação → Interaction Trigger + fallback 8s

---

# ERROS COMUNS DO AGENTE

1. **Import estático**: Usar `import THREE from 'three'` no topo (SEMPRE use Dynamic Import)
2. **Script no HTML**: Linkar módulo pesado no HTML além do Dynamic Import
3. **Corrigir parcialmente**: Verificar apenas algumas imagens, não todas
4. **Remover biblioteca incompleto**: Remover JS mas esquecer CSS
5. **height="auto"**: Usar "auto" mesmo documentação dizendo para não usar
6. **Pular auditoria**: Ir direto para correções sem listar problemas
7. **AOS solto**: Deixar AOS injetar no body sem `disableMutationObserver`
8. **Tudo junto**: Iniciar 3D + Partículas + Fonts no mesmo momento

---

# TESTANDO

1. **PageSpeed**: https://pagespeed.web.dev/
2. **DevTools Performance**: gravar 5s scroll
3. **DevTools Network**: verificar se Dynamic Imports funcionam (módulos só aparecem após interação)
4. **Meta**: 90+ Score Desktop E Mobile, 60 FPS
