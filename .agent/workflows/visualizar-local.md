---
description: visualizar-local
---

# Instruções

O usuário quer visualizar a página no navegador localmente.

---

## REGRA ABSOLUTA: Apenas Netlify Dev

**NUNCA** use alternativas como `python -m http.server`, `npx serve`, etc.

O Netlify Dev é **OBRIGATÓRIO** porque:
1. CDN de imagens (`/.netlify/images`) só funciona com ele
2. Redirects do netlify.toml são simulados
3. Formulários Netlify funcionam
4. Mostra o site EXATAMENTE como vai ao ar

---

## Processo (SEMPRE seguir)

### 1. Verificar se já existe servidor DESTA pasta

```bash
lsof -i :8888 -i :8889 -i :8890 -i :3999 -i :4000 -i :4001 2>/dev/null | grep node
```

Se encontrar processos, verifique o diretório de trabalho:

```bash
lsof -p {PID} 2>/dev/null | grep cwd
```

**Se o diretório for a pasta atual:**
- Servidor já está rodando
- Informe o link ao usuário
- **NÃO crie outro servidor**

### 2. Se NÃO houver servidor desta pasta

Escolha o primeiro par de portas livre:

- 8888 / 3999
- 8889 / 4000
- 8890 / 4001

### 3. Iniciar (apenas se necessário)

```bash
netlify dev --port {PRINCIPAL} --functions-port {FUNCOES}
```

---

## Ao Finalizar

Informe a URL:

> "Servidor em http://localhost:{PORTA}"

Após fornecer o link:
1. Aguarde o usuário visualizar
2. **PARE COMPLETAMENTE E AGUARDE**

**NUNCA** continue para outras etapas automaticamente.
