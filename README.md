# Emersol.ai

Site institucional da Emersol.ai: automação, IA aplicada, sistemas, sites e hospedagem para empresas de serviços. Páginas estáticas em português (Brasil), inglês, espanhol (Espanha) e alemão. O formulário só confirma o envio quando um webhook ou o SMTP entrega a mensagem de verdade.

Build local:

```bash
npm ci
npm run build
```

A pasta `dist/` é o que se publica.

## Requisitos

- Node.js 22 ou mais recente, para gerar o site.
- PHP 8.1 ou mais recente no servidor que recebe o formulário, com OpenSSL (webhook HTTPS e SMTP com TLS). Não é preciso banco de dados, Composer nem serviço pago.

## Instalação

```bash
npm ci
```

Para ver o site na máquina local:

```bash
npm run dev
```

O `astro dev` não executa PHP. O formulário, nesse modo, responde com erro de rede. Isso é esperado: não há confirmação falsa.

## Onde está cada coisa

| Assunto | Arquivo |
| --- | --- |
| Dados do negócio (e-mail, telefone, endereço, preços, casos) | `src/config/site.ts` |
| Textos dos quatro idiomas | `src/i18n/dictionaries/` |
| Idiomas, hreflang e URLs | `src/i18n/locales.ts`, `src/i18n/routes.ts` |
| Formulário no servidor | `public/api/contact.php` |
| Modelo de segredos | `.env.example` |

Campo vazio em `src/config/site.ts` significa “ainda não informado”. O site omite o dado. Não preencha com exemplo, cliente, depoimento ou número.

## Formulário

O navegador envia o pedido para `/api/contact.php`. O PHP lê os segredos fora do docroot, nesta ordem:

1. Variáveis já definidas no servidor.
2. O arquivo apontado por `EMERSOL_ENV_FILE`.
3. `private/.env` um nível acima do docroot.
4. `.env` um nível acima do docroot.

Não coloque o `.env` dentro de `httpdocs`. Um exemplo de caminho no Plesk:

```text
/var/www/vhosts/emersol.ai/private/.env
/var/www/vhosts/emersol.ai/httpdocs/    ← conteúdo de dist/
```

```bash
cp .env.example /caminho/private/.env
chmod 600 /caminho/private/.env
```

É preciso pelo menos um destino:

- `WEBHOOK_URL` em HTTPS (no teste local, `http://127.0.0.1` também vale). O cabeçalho `X-Webhook-Secret` sai se `WEBHOOK_SECRET` estiver preenchido. O n8n em `https://n8n.emersol.ai` entra aqui com o URL do webhook que você criar.
- ou SMTP: `SMTP_HOST`, `SMTP_FROM` e `CONTACT_TO`. `SMTP_TLS` pode ser `starttls` (padrão), `ssl` ou `none`.

Se os dois existirem, basta um aceitar a mensagem. Se nenhum existir, a resposta é erro `not_configured` e o texto deixa claro que nada foi enviado.

Antiabuso, sem serviço externo obrigatório:

- campo honeypot;
- tempo mínimo de preenchimento quando o navegador informa a hora de abertura;
- limite simples por IP (hash salgado, janela padrão de uma hora).

Cloudflare Turnstile fica desligado. Para ligar, preencha `turnstileSiteKey` em `src/config/site.ts` e `TURNSTILE_SECRET` no `.env`. Os dois juntos.

`ALLOWED_ORIGINS` no exemplo já traz `https://emersol.ai`. Inclua a origem local só enquanto testa.

O e-mail público, o que aparece no site e na política, fica só em `src/config/site.ts`. O `npm run build` grava a cópia pública em `public/runtime-config.json` para o PHP mostrar o mesmo endereço quando o envio falha. Não é segredo.

Teste do endpoint, com PHP na máquina:

```bash
npm run test:contact
```

Ele cobre destino ausente, honeypot, envio rápido demais, validação, origem estranha, webhook com sucesso, webhook com falha e SMTP local. Nenhum desses caminhos, fora os dois sucessos reais, devolve confirmação.

## Publicar no Plesk ou num VPS

Gere o site e envie só o docroot. O `--delete` apaga no destino o que não está em `dist/`. Use-o apenas na pasta pública, nunca na raiz do domínio (senão some o `private/.env`).

```bash
npm ci
npm run build
rsync -av --delete dist/ usuario@servidor:/var/www/vhosts/emersol.ai/httpdocs/
```

No domínio:

- PHP ativo para `httpdocs/api/contact.php`.
- Página de erro 404 apontando para `/404.html`. A página está nos quatro idiomas porque o nginx serve um único documento.
- Se quiser, as diretivas de exemplo em `deploy/plesk-nginx.conf` (bloquear arquivos ocultos).

Não há passo de DNS neste repositório.

O workflow `.github/workflows/deploy.yml` existe e não corre enquanto a variável de repositório `DEPLOY_ENABLED` não for exatamente `true`. Mesmo assim ele exige segredos (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY`) que não estão no código. O caminho normal é o `rsync` acima.

## Manutenção

Textos: edite o dicionário do idioma e rode o build de novo. O TypeScript recusa um idioma incompleto.

Novo idioma:

1. Inclua o código em `src/i18n/locales.ts` (`hreflang`, `htmlLang`, `ogLocale`).
2. Acrescente a coluna de URLs em `src/i18n/routes.ts`.
3. Crie o dicionário e registre em `src/i18n/index.ts`.
4. Gere a imagem `public/og/{idioma}.png` no mesmo formato das outras.
5. Se quiser a página de erro sem JavaScript nesse idioma, acrescente o bloco em `public/api/contact.php`. Sem isso, o PHP cai no português.

Preços: `pricing.enabled` em `src/config/site.ts` vem `false` e a rota não é gerada. Ao ligar, os três formatos aparecem. `amounts` vazio continua a dizer que o valor vai na proposta. Não invente número.

Estudos de caso: o array `caseStudies` começa vazio. Uma entrada só deve existir com autorização de quem é citado, nome, país, ano e texto no idioma. Sem isso, a página de projetos mostra o espaço vazio de propósito. Projetos próprios (Emersoft, Solzi, monitoramento, COGEDE) não são casos de cliente.

Medição de audiência e aviso de cookies vêm desligados. Para um Plausible ou Umami, inclusive self-hosted, preencha `analytics.scriptSrc` e, se o script usar cookie, ligue também `cookies.bannerEnabled`. Com o aviso ligado, o script só carrega depois do aceite.

O `x-default` do hreflang aponta para o português, que é o idioma sem prefixo na URL.

## Idiomas

O português é o de partida, escrito para quem lê no Brasil e também em Portugal. Inglês, espanhol e alemão foram redigidos para soar naturais, não como tradução palavra a palavra. Vale uma revisão por falante nativo do espanhol (Espanha) e do alemão antes de tratar esses textos como finais.

## O que é indispensável para colocar no ar

1. E-mail público em `src/config/site.ts` (`email`).
2. Identificação do responsável no mesmo arquivo: `legalName`, identificador fiscal (`taxId`) e endereço. A política de privacidade publica só o que estiver preenchido.
3. Um destino real no `.env` fora do docroot: `WEBHOOK_URL` ou o trio `SMTP_HOST`, `SMTP_FROM` e `CONTACT_TO`.
4. `dist/` no docroot do domínio, com PHP ativo para `/api/contact.php`.
