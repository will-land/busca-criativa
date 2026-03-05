---
name: forms
description: Use when creating or modifying contact forms, lead capture forms, or any form with a phone field. Includes intl-tel-input with masks, email validation, Netlify Forms integration with AJAX submit, and thank you page redirect.
---

# Skill: Forms

Formulários com Netlify Forms, validação internacional de telefone e submit via AJAX.

---

## Estrutura HTML Completa

```html
<form
  name="contato"
  method="POST"
  action="/obrigado.html"
  data-netlify="true"
  netlify-honeypot="bot-field"
  data-form
  class="form"
>
  <!-- OBRIGATÓRIO para AJAX: hidden input com form-name -->
  <input type="hidden" name="form-name" value="contato">

  <!-- Honeypot anti-spam -->
  <p hidden><label>Não preencha: <input name="bot-field"></label></p>

  <div class="form-group">
    <label class="form-label" for="nome">Nome</label>
    <input type="text" id="nome" name="nome" class="form-input" required autocomplete="name">
  </div>

  <div class="form-group">
    <label class="form-label" for="email">E-mail</label>
    <input type="email" id="email" name="email" class="form-input" required autocomplete="email">
  </div>

  <div class="form-group">
    <label class="form-label" for="telefone">WhatsApp</label>
    <input type="tel" id="telefone" name="telefone" class="form-input" required autocomplete="tel">
  </div>

  <div class="form-feedback"></div>
  <button type="submit" class="btn">Enviar</button>
</form>
```

---

## Atributos Obrigatórios do Form

- `name` = Nome único → Identificador no dashboard Netlify
- `method` = `POST` → Método de envio
- `action` = `/pagina-obrigado.html` → Redirect após sucesso
- `data-netlify` = `true` → Ativa Netlify Forms
- `netlify-honeypot` = `bot-field` → Anti-spam
- `data-form` (sem valor) → Seletor para JavaScript

### Hidden Input OBRIGATÓRIO

```html
<input type="hidden" name="form-name" value="contato">
```

**CRÍTICO:** O `value` DEVE ser EXATAMENTE igual ao atributo `name` do `<form>`. Sem isso, o submit via AJAX não funciona.

---

## JavaScript para Submit via AJAX

### Código Correto

```javascript
function initForms() {
  const forms = document.querySelectorAll('form[data-form]');
  forms.forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const feedback = form.querySelector('.form-feedback');

  // Validação
  let isValid = true;
  const requiredFields = form.querySelectorAll('[required]');

  requiredFields.forEach(field => {
    field.classList.remove('error');
    if (!field.value.trim()) {
      field.classList.add('error');
      isValid = false;
    }
    if (field.type === 'email' && field.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value)) {
        field.classList.add('error');
        isValid = false;
      }
    }
  });

  if (!isValid) {
    if (feedback) feedback.textContent = 'Preencha todos os campos corretamente.';
    return;
  }

  // Loading state
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  try {
    const formData = new FormData(form);

    // ⚠️ CRÍTICO: URL do fetch
    // NUNCA use '/' - causa problemas com redirects
    // Use o action do form ou window.location.pathname
    const response = await fetch(form.getAttribute('action') || window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString()
    });

    if (response.ok) {
      // Meta Pixel (se configurado)
      if (typeof fbq === 'function') {
        fbq('track', 'Lead');
      }

      // Redirect para página de obrigado
      const action = form.getAttribute('action');
      if (action) {
        window.location.href = action;
        return;
      }

      // Fallback: mostrar mensagem
      if (feedback) {
        feedback.textContent = 'Enviado com sucesso!';
        feedback.classList.add('success');
      }
      form.reset();
    } else {
      throw new Error('Erro no envio');
    }
  } catch (error) {
    console.error('Form error:', error);
    if (feedback) {
      feedback.textContent = 'Erro ao enviar. Tente novamente.';
      feedback.classList.add('error');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

document.addEventListener('DOMContentLoaded', initForms);
```

### Pontos CRÍTICOS do JavaScript

- URL do fetch → `form.getAttribute('action')` (NUNCA `'/'`)
- Content-Type → `application/x-www-form-urlencoded` (NUNCA `application/json`)
- Body → `new URLSearchParams(formData).toString()` (NUNCA `JSON.stringify`)
- FormData → `new FormData(form)` (NUNCA montar objeto manualmente)

---

## Página de Agradecimento

Crie uma página separada para o redirect após sucesso:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Obrigado!</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <section class="thank-you">
    <h1>Inscrição Confirmada!</h1>
    <p>Você será redirecionado em <span id="countdown">10</span> segundos...</p>
    <a href="https://link-do-grupo" class="btn" id="btn-action">Entrar no Grupo</a>
  </section>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      let count = 10;
      const countdownEl = document.getElementById('countdown');
      const linkDestino = document.getElementById('btn-action').href;

      const timer = setInterval(() => {
        count--;
        if (countdownEl) countdownEl.textContent = count;
        if (count <= 0) {
          clearInterval(timer);
          window.location.href = linkDestino;
        }
      }, 1000);
    });
  </script>
</body>
</html>
```

---

## intl-tel-input (Telefone Internacional)

Já configurado no template com:
- Strict mode (máscara obrigatória)
- Brasil como país padrão
- Validação automática
- Formato internacional no envio

CDNs necessárias:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.10/build/css/intlTelInput.css">
<script src="https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.10/build/js/intlTelInput.min.js"></script>
```

---

## Meta Pixel (Facebook/Instagram)

### Na página do form (PageView + Lead no submit)

```html
<head>
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'SEU_PIXEL_ID');
  fbq('track', 'PageView');
  </script>
</head>
```

O evento `Lead` é disparado no JavaScript do form (ver código acima).

### Na página de obrigado (apenas PageView)

```html
<script>
  // ... código do pixel ...
  fbq('init', 'SEU_PIXEL_ID');
  fbq('track', 'PageView');
  // NÃO colocar Lead aqui - já foi disparado no submit
</script>
```

---

## Dashboard do Netlify

Após deploy, os envios aparecem em: **Site > Forms > [nome do formulário]**

Configure notificações: **Site > Forms > Form notifications** (Email, Slack, Webhook)

---

## Checklist de Verificação

### HTML
- [ ] `name="nome-unico"` no `<form>`
- [ ] `method="POST"`
- [ ] `data-netlify="true"`
- [ ] `action="/pagina-obrigado.html"`
- [ ] `netlify-honeypot="bot-field"`
- [ ] `<input type="hidden" name="form-name" value="nome-unico">`
- [ ] Campo honeypot dentro de elemento `hidden`

### JavaScript
- [ ] Fetch usa `form.getAttribute('action')` (NÃO usa `'/'`)
- [ ] Header `Content-Type: application/x-www-form-urlencoded`
- [ ] Body usa `new URLSearchParams(formData).toString()`
- [ ] FormData criado a partir do form

### Netlify
- [ ] Form aparece listado após deploy
- [ ] Submissões aparecem no painel

---

## Troubleshooting

### Form não aparece no painel Netlify

1. Verificar `data-netlify="true"` no `<form>`
2. Fazer novo deploy (Clear cache and deploy)
3. Verificar se form detection está habilitado em Forms > Settings

### Submissões não são registradas

1. Verificar se `form-name` hidden tem valor EXATO do `name` do form
2. Verificar se fetch NÃO está enviando para `'/'` (usar `action`)
3. Verificar console do browser por erros
4. Testar submit nativo (sem JS) para isolar problema

### Redirect após submit não funciona

1. Verificar se `action` do form está com caminho correto
2. Verificar se JavaScript redireciona após `response.ok`
3. Verificar se não há erro antes do redirect

### Telefone não valida / Bandeiras não aparecem

1. Verificar se CSS e JS do intl-tel-input carregaram
2. Verificar console por erros de carregamento
