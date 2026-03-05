---
description: publicar
---

# Instruções

O usuário quer fazer deploy para produção. Este workflow cobre tanto o **primeiro deploy** quanto **atualizações**.

## REGRA DE OURO: Autonomia Total

**VOCÊ DEVE fazer tudo sozinho. NUNCA peça para o usuário executar comandos manualmente.**

Quando um comando for interativo (como `netlify init`), VOCÊ deve:
1. Executar o comando
2. Enviar os inputs necessários para responder aos prompts
3. Continuar até concluir

Se algo falhar, tente resolver. Só peça ajuda ao usuário se realmente não conseguir resolver sozinho.

## Primeiro: Identificar o Cenário

Execute estas verificações para identificar o estado atual:

```bash
# Verificar se é repositório Git
git remote -v

# Verificar se está conectado ao Netlify
netlify status
```

### Interpretação dos Resultados

- Git vazio + Netlify não linkado → **Cenário A** (Configuração inicial completa)
- Git com URL GitHub + Netlify não linkado → **Cenário B** (Apenas conectar Netlify)
- Git com URL GitHub + Site linkado sem CI/CD → **Cenário C** (Configurar integração Git)
- Git com URL GitHub + Site linkado com CI/CD → **Cenário D** (Apenas fazer push)

---

## Cenário A: Configuração Inicial Completa

### Passo 1: Inicializar Git

```bash
git init
git add .
git commit -m "Versão inicial"
```

### Passo 2: Criar repositório no GitHub

Pergunte ao usuário qual nome quer para o repositório, depois execute:

```bash
gh repo create NOME-DO-REPOSITORIO --public --source=. --push
```

### Passo 3: Conectar ao Netlify

**IMPORTANTE:** Use `netlify init` SEM a flag `--manual`.

```bash
netlify init
```

**VOCÊ deve responder aos prompts interativos enviando inputs:**

1. **"What would you like to do?"**
   → Envie: `1` ou selecione **"Create & configure a new site"**

2. **"Team"**
   → Envie: `1` (geralmente o primeiro time)

3. **"Site name"**
   → Envie: o nome desejado (será: nome.netlify.app)

4. **"Your build command"**
   → Envie: apenas Enter (deixar vazio)

5. **"Directory to deploy"**
   → Envie: `.` (ponto)

6. **Autorização OAuth**
   → O navegador abrirá automaticamente para o usuário autorizar
   → Informe ao usuário que ele precisa autorizar no navegador que abriu
   → Aguarde a conclusão

7. **Confirmação**
   → Deve aparecer: `Success! Netlify CI/CD Configured!`

**Se o comando travar esperando input:** Envie o input correto. NUNCA desista e peça pro usuário fazer manualmente.

### Passo 4: Verificar a Conexão

```bash
netlify status
```

Deve mostrar informações do site com "Linked to" apontando para o repositório GitHub.

Também verifique no painel:

```bash
netlify open:admin
```

Em **"Site configuration"** > **"Build & deploy"** > **"Continuous deployment"** deve mostrar o repositório GitHub conectado.

### Pronto!

Informe ao usuário:
- O site está no ar em: https://NOME.netlify.app
- Cada `git push origin main` vai atualizar o site automaticamente
- Para testar antes de ir para produção, use `/previsualizar`

---

## Cenário B: Git OK, Falta Netlify

O repositório já está no GitHub. Apenas conecte ao Netlify:

```bash
netlify init
```

Selecione **"Create & configure a new site"** e siga os passos do Cenário A (Passo 3 em diante).

---

## Cenário C: Falta Integração CI/CD

O site existe no Netlify mas não está com deploy automático. Configure:

```bash
netlify open:admin
```

No painel:
1. Vá em **"Site configuration"** > **"Build & deploy"** > **"Continuous deployment"**
2. Clique em **"Link site to Git"**
3. Selecione **GitHub** e autorize
4. Selecione o repositório correto
5. Configure: Branch = `main`, Build command = (vazio), Publish directory = `.`
6. Confirme

Depois faça um push para testar:

```bash
git add .
git commit -m "Testar CI/CD"
git push origin main
```

---

## Cenário D: Tudo Configurado - Apenas Push

### Passo 1: Verificações Pré-Deploy

Antes de enviar, verifique rapidamente:

- [ ] Imagens usando Netlify CDN (`/.netlify/images?url=`)?
- [ ] Hero sem animação de entrada?
- [ ] CSS crítico inline no head?
- [ ] Formulário funcionando?
- [ ] Console sem erros?
- [ ] Site responsivo?
- [ ] Links funcionando?

### Passo 2: Commit e Push

```bash
git status
git add .
git commit -m "Descrição das alterações"
git push origin main
```

### Passo 3: Confirmar Deploy

O Netlify inicia o deploy automaticamente. Para acompanhar:

```bash
netlify open:admin
```

Ou aguarde alguns segundos e acesse o site.

### Pronto!

Informe ao usuário:
- O deploy foi iniciado automaticamente
- Em alguns segundos o site estará atualizado
- Forneça o link do site

---

## Troubleshooting

### "Push não dispara deploy automático"

A integração Git pode não estar configurada. Verifique:

```bash
netlify open:admin
```

Vá em **"Site configuration"** > **"Build & deploy"** > **"Continuous deployment"**.

Se não mostrar o GitHub conectado, siga o **Cenário C**.

### "Erro: remote origin already exists"

O repositório Git já existe. Pule para verificar o Netlify.

### "Erro: not a git repository"

Execute `git init` primeiro (Cenário A).

### "netlify status mostra site mas não mostra repo"

O site foi criado com `--manual` ou `sites:create`. Precisa reconfigurar. Siga o **Cenário C**.

### "Site atualiza mas com versão antiga"

Pode ser cache. Peça ao usuário para:
- Fazer hard refresh (Cmd+Shift+R ou Ctrl+Shift+R)
- Ou abrir em aba anônima

### "Deploy falhou no Netlify"

Verifique os logs:

```bash
netlify open:admin
```

Vá em **"Deploys"** e clique no deploy com erro para ver os logs.

Erros comuns:
- Arquivo com nome inválido
- Imagem muito grande (>25MB)
- Erro de sintaxe no netlify.toml

---

## NUNCA Fazer

- **NUNCA** use `netlify init --manual` (não configura OAuth corretamente)
- **NUNCA** use `netlify sites:create` (cria site sem integração Git)
- **NUNCA** use `netlify deploy --prod` para deploy normal (perde histórico Git)

O `netlify deploy --prod` só deve ser usado em emergências quando a integração Git falhar.

---

## Alternativa: Testar Antes de Produção

Se o usuário quiser testar antes de ir para produção, sugira usar `/previsualizar` que cria um Deploy Preview via Pull Request sem afetar o site principal.

## Ao Finalizar

Após o deploy:

1. Informe que o site está no ar
2. Forneça o link do site
3. **PARE COMPLETAMENTE E AGUARDE**

## IMPORTANTE: Regras de Comportamento

- Após o deploy, PARE e aguarde instrução do usuário
- NUNCA continue fazendo alterações automaticamente
- NUNCA rode outros workflows automaticamente
