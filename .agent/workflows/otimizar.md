---
description: otimizar
---

# Workflow: Otimizar Performance

Meta: **Score 90+ no PageSpeed** (Desktop E Mobile) e **60 FPS constantes**.

---

# FASE 1: AUDITORIA (OBRIGATÓRIA)

**NUNCA corrija antes de completar a auditoria.**

## Passo 1: Ler Todos os Arquivos

Leia COMPLETAMENTE: `index.html`, `style.css`, `script.js` e qualquer CSS/JS linkado.

## Passo 2: Identificar TODOS os Problemas

### 2.1 Imagens
Para CADA `<img>`: Netlify CDN? width/height numéricos? loading correto (eager hero, lazy resto)?

### 2.2 CSS
CSS externo blocante? Bibliotecas não usadas? Falta critical CSS inline? Falta `contain: layout paint`?

### 2.3 Scripts
Para CADA `<script>`: tem defer/async? biblioteca removível? versão .min.js? **Módulo pesado linkado no HTML?** (deveria ser só Dynamic Import)

Para CADA import estático no JS: **Biblioteca pesada?** (Three.js, GSAP) - DEVE ser Dynamic Import!

### 2.4 Hero/LCP (CRÍTICO)
opacity:0 inicial? data-aos? Animação de entrada? transform inicial? Botões com transform/opacity? Hero tem min-height fixo?

### 2.5 Resource Hints
Falta preconnect fonts? dns-prefetch analytics? preload hero image?

### 2.6 Fontes
Weights > 3? display=swap? Carregamento bloqueante?

### 2.7 Third-Party / AOS
Analytics carrega imediatamente? AOS injeta classes no body/html? (PROIBIDO - causa CLS)

### 2.8 JS Runtime
Múltiplos RAF loops? Scroll sem throttle? Não pausa off-screen/tab inativa?

### 2.9 CSS Animations
will-change permanente? filter: grayscale() hover?

### 2.10 Canvas/Partículas/Three.js
Import estático? Módulo linkado no HTML? Carrega no load? GLB > 500KB sem Draco? Luzes > 3? Antialias on mobile?

### 2.11 Vídeos/Iframes
Vídeos sem poster/preload="none"? Iframes sem loading="lazy"?

## Passo 3: Apresentar Relatório

1. **Resumo**: X problemas encontrados
2. **Lista** por impacto: CRÍTICO (LCP/TBT), ALTO (métricas secundárias), MÉDIO (runtime/FPS), BAIXO (incrementais)

**Aguarde aprovação antes de corrigir.**

---

# FASE 2: CORREÇÕES

## Regras Críticas
1. Corrigir TODAS as imagens, não algumas
2. Remover biblioteca = CSS + JS + código + classes HTML
3. width/height = NÚMEROS (nunca "auto", "100%")
4. Bibliotecas pesadas (>100KB) DEVEM usar Dynamic Import
5. **NUNCA desabilitar recursos - otimizar para que funcionem**

---

## PADRÃO OBRIGATÓRIO: Interaction Trigger

```javascript
let interacted = false;
const callbacks = [];

function onFirstInteraction(callback) {
  if (interacted) { callback(); return; }
  callbacks.push(callback);
}

['scroll', 'touchstart', 'click', 'keydown'].forEach(event => {
  window.addEventListener(event, () => {
    if (interacted) return;
    interacted = true;
    callbacks.forEach(cb => cb());
  }, { once: true, passive: true });
});

setTimeout(() => {
  if (!interacted) { interacted = true; callbacks.forEach(cb => cb()); }
}, 8000);
```

**Usar para:** Three.js, Partículas, Chat, Analytics, Pixels, GSAP.

---

## Correções por Categoria

### 1. Imagens
```html
<img src="/.netlify/images?url=/images/foto.jpg&w=600&q=80" width="600" height="400" loading="lazy">
<!-- Hero: loading="eager" fetchpriority="high" -->
```

### 2. Resource Hints
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="dns-prefetch" href="//www.google-analytics.com">
```

### 3. Fontes (Assíncrono)
```html
<link href="https://fonts.googleapis.com/css2?family=Font:wght@400;700&display=swap"
      rel="stylesheet" media="print" onload="this.media='all'">
<noscript><link href="..." rel="stylesheet"></noscript>
```

### 4. CSS
```html
<link rel="stylesheet" href="/style.css" media="print" onload="this.media='all'">
```
```css
.section { contain: layout paint; }
```

### 5. Hero (LCP)
Remover do hero: opacity:0, data-aos, animações de entrada, transform inicial. **Texto visível no primeiro frame.**

### 6. Scripts
```html
<script src="/script.js" defer></script>
```
**Módulos pesados NÃO no HTML - só Dynamic Import.**

### 7. Third-Party
```javascript
onFirstInteraction(() => { loadAnalytics(); loadPixels(); loadChat(); });
```

### 8. Vídeos/Iframes
```html
<video poster="poster.jpg" preload="none">...</video>
<iframe src="..." loading="lazy"></iframe>
```

### 9. Content-Visibility
```css
.section-below-fold { content-visibility: auto; contain-intrinsic-size: 0 500px; }
```

### 10. Acessibilidade
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

### 11. AOS
```javascript
onFirstInteraction(() => { AOS.init({ once: true, disableMutationObserver: true }); });
```

### 12. JS Runtime
```javascript
let scheduled = false;
addEventListener('scroll', () => {
  if (!scheduled) { requestAnimationFrame(() => { update(); scheduled = false; }); scheduled = true; }
}, { passive: true });
// + IntersectionObserver para pausar off-screen + visibilitychange para tab inativa
```

### 13. Canvas/Partículas
```javascript
onFirstInteraction(async () => {
  const { initParticles } = await import('./particles.js');
  initParticles({ count: window.innerWidth < 768 ? 25 : 40 });
});
```

### 14. Three.js
```javascript
onFirstInteraction(async () => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
  // isMobile: antialias OFF, pixelRatio 1, MAX 3 luzes
});
```

---

# ERROS CRÍTICOS A EVITAR

## 1. Script no Caminho Crítico
```html
<!-- ERRADO --><script src="/module-3d.js" defer></script>
<!-- CORRETO: módulo pesado SÓ via Dynamic Import, sem referência no HTML -->
```

## 2. Falso Deferimento
```javascript
// ERRADO - import estático SEMPRE baixa imediatamente
import * as THREE from 'three';
setTimeout(() => initScene(), 5000); // THREE já foi baixado!
// CORRETO: await import('three')
```

## 3. CLS no Body
- AOS sem `disableMutationObserver: true`
- Fontes sem font-display: swap / classe .fonts-loaded
- Hero sem min-height fixo
- Botões com transform/opacity inicial

## 4. LCP Oculto
```css
/* ERRADO */ .hero-title { opacity: 0; animation: fadeIn... }
/* Hero visível no primeiro frame */
```

---

# FASE 3: VALIDAÇÃO

1. Confirmar cada problema da auditoria corrigido
2. Relatório: CORRIGIDO vs NÃO CORRIGIDO

## Verificações DevTools

**Network Tab:** Módulos pesados NÃO aparecem no carregamento inicial, SÓ após scroll/click.

**Performance Tab:** CLS < 0.1, LCP < 2.5s, TBT < 200ms

**Se CLS alto:** AOS disableMutationObserver? Fontes swap? Hero min-height? Botões sem transform?

**Se script no caminho crítico:** Remover `<script src="modulo-pesado.js">` do HTML, usar só Dynamic Import.

3. Link para teste (skill `local-server`)
4. Instruir PageSpeed: https://pagespeed.web.dev/
5. **Testar MOBILE separadamente**
6. **PARAR E AGUARDAR**

---

# REGRAS

- **NUNCA** corrija sem auditoria completa
- **NUNCA** corrija parcialmente
- **NUNCA** use import estático para bibliotecas pesadas
- **NUNCA** linke módulos pesados no HTML
- **NUNCA** permita bibliotecas injetarem no body/html
- **NUNCA** desabilite recursos - otimize para que funcionem
- **NUNCA** deploy automático - aguarde comando explícito

---

# PROBLEMAS COMUNS

- CLS 0.7+ body → AOS classes → `disableMutationObserver: true`
- CLS alto → height="auto" → height NUMÉRICO + contain
- CLS hero → Fontes reflow → font-display: swap
- LCP alto → opacity:0 hero → Hero visível 1o frame
- TBT alto → import estático → Dynamic Import + Interaction Trigger
- Script crítico → `<script src>` no HTML → Só Dynamic Import
- FCP alto → CSS/Fonts bloqueantes → media="print" onload
