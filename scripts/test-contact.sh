#!/usr/bin/env bash
# Prova o endpoint real: sem destino configurado não há sucesso;
# com webhook ou SMTP, só há sucesso depois da entrega.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node --experimental-strip-types scripts/write-public-config.ts >/dev/null

PORT="${PORT:-8765}"
HOOK_PORT="${HOOK_PORT:-9876}"
SMTP_PORT="${SMTP_PORT:-2525}"
ORIGIN="http://127.0.0.1:${PORT}"
OLD="$(node -e 'console.log(Date.now()-8000)')"
BODY_FILE="$(mktemp)"
HOOK_FILE="$(mktemp)"
SMTP_FILE="$(mktemp)"
PIDS=()

cleanup() {
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  rm -f "$BODY_FILE" "$HOOK_FILE" "$SMTP_FILE"
}
trap cleanup EXIT

start_php() {
  local env_file="$1"
  env -i PATH="$PATH" HOME="${HOME:-/tmp}" EMERSOL_ENV_FILE="$env_file" \
    php -S "127.0.0.1:${PORT}" -t public > /tmp/emersol-php.log 2>&1 &
  PIDS+=("$!")
  for _ in $(seq 1 30); do
    code="$(curl -s -o /dev/null -w "%{http_code}" "${ORIGIN}/api/contact.php" || true)"
    if [[ "$code" == "405" ]]; then
      return
    fi
    sleep 0.1
  done
  echo "PHP did not start" >&2
  cat /tmp/emersol-php.log >&2 || true
  exit 1
}

stop_php() {
  if [[ ${#PIDS[@]} -gt 0 ]]; then
    kill "${PIDS[-1]}" 2>/dev/null || true
    unset "PIDS[-1]"
  fi
  sleep 0.2
}

post() {
  local payload="$1"
  local started="${2:-$OLD}"
  curl -s -o "$BODY_FILE" -w "%{http_code}" \
    -H "Origin: ${ORIGIN}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d "${payload//__STARTED__/$started}" \
    "${ORIGIN}/api/contact.php"
}

assert_not_success() {
  if grep -q '"ok":true' "$BODY_FILE"; then
    echo "unexpected success: $(cat "$BODY_FILE")" >&2
    exit 1
  fi
  if grep -Eq 'Mensagem enviada|Message sent|Mensaje enviado|Nachricht gesendet' "$BODY_FILE"; then
    echo "unexpected confirmation text: $(cat "$BODY_FILE")" >&2
    exit 1
  fi
}

VALID='{"locale":"pt","name":"Ana Silva","company":"Oficina Norte","email":"ana.silva@example.com","country":"PT","website":"","phone":"","problem":"Os pedidos de orçamento ficam no WhatsApp e ninguém vê o retorno.","budget":"undefined","timeline":"exploring","consent":"yes","company_fax":"","started_at":__STARTED__}'

EMPTY_ENV="$(mktemp)"
echo "# vazio de propósito" > "$EMPTY_ENV"
printf 'ALLOWED_ORIGINS=%s\nRATELIMIT_DIR=%s\nRATELIMIT_MAX=20\n' "$ORIGIN" "$(mktemp -d)" >> "$EMPTY_ENV"

start_php "$EMPTY_ENV"

code="$(post "$VALID")"
[[ "$code" == "503" ]] || { echo "expected 503, got $code $(cat "$BODY_FILE")"; exit 1; }
assert_not_success
grep -q '"error":"not_configured"' "$BODY_FILE"

code="$(post "${VALID/\"company_fax\":\"\"/\"company_fax\":\"filled\"}")"
[[ "$code" == "400" ]] || { echo "honeypot expected 400, got $code"; exit 1; }
assert_not_success

code="$(post "$VALID" "$(node -e 'console.log(Date.now())')")"
[[ "$code" == "400" ]] || { echo "fast submit expected 400, got $code $(cat "$BODY_FILE")"; exit 1; }
assert_not_success

code="$(post '{"locale":"en","name":"A","company":"B","email":"not-an-email","country":"","problem":"curto","budget":"","timeline":"","consent":"","started_at":__STARTED__}')"
[[ "$code" == "400" ]] || { echo "validation expected 400, got $code"; exit 1; }
grep -q '"error":"validation"' "$BODY_FILE"
assert_not_success

code="$(curl -s -o "$BODY_FILE" -w "%{http_code}" -H "Origin: https://evil.example" -H "Accept: application/json" -H "Content-Type: application/json" -d "${VALID/__STARTED__/$OLD}" "${ORIGIN}/api/contact.php")"
[[ "$code" == "400" ]] || { echo "origin expected 400, got $code"; exit 1; }
assert_not_success

stop_php

node --input-type=module <<EOF &
import http from "node:http";
import { writeFileSync } from "node:fs";
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    writeFileSync("$HOOK_FILE", JSON.stringify({ headers: req.headers, body }));
    if (req.url === "/fail") {
      res.writeHead(500);
      res.end("no");
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"ok":true}');
  });
});
server.listen($HOOK_PORT, "127.0.0.1");
EOF
PIDS+=("$!")
for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:${HOOK_PORT}/health" && break || true
  sleep 0.1
done

HOOK_ENV="$(mktemp)"
printf 'ALLOWED_ORIGINS=%s\nWEBHOOK_URL=http://127.0.0.1:%s/hook\nWEBHOOK_SECRET=test-secret\nRATELIMIT_DIR=%s\nRATELIMIT_MAX=20\n' \
  "$ORIGIN" "$HOOK_PORT" "$(mktemp -d)" > "$HOOK_ENV"
start_php "$HOOK_ENV"

code="$(post "$VALID")"
[[ "$code" == "200" ]] || { echo "webhook expected 200, got $code $(cat "$BODY_FILE")"; exit 1; }
grep -q '"ok":true' "$BODY_FILE"
grep -q 'test-secret' "$HOOK_FILE"
grep -q 'ana.silva@example.com' "$HOOK_FILE"
node -e 'const fs=require("fs"); const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const b=JSON.parse(p.body); if(b.company_fax) process.exit(1);' "$HOOK_FILE"

FAIL_ENV="$(mktemp)"
printf 'ALLOWED_ORIGINS=%s\nWEBHOOK_URL=http://127.0.0.1:%s/fail\nRATELIMIT_DIR=%s\nRATELIMIT_MAX=20\n' \
  "$ORIGIN" "$HOOK_PORT" "$(mktemp -d)" > "$FAIL_ENV"
stop_php
start_php "$FAIL_ENV"
code="$(post "$VALID")"
[[ "$code" == "502" ]] || { echo "failed webhook expected 502, got $code $(cat "$BODY_FILE")"; exit 1; }
assert_not_success
stop_php

node --input-type=module <<EOF &
import net from "node:net";
import { writeFileSync } from "node:fs";
const server = net.createServer((socket) => {
  let buffer = "";
  let dataMode = false;
  let message = "";
  socket.write("220 emersol test\r\n");
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    if (!dataMode) {
      const lines = buffer.split("\r\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const upper = line.toUpperCase();
        if (upper.startsWith("EHLO") || upper.startsWith("HELO")) socket.write("250 hello\r\n");
        else if (upper.startsWith("MAIL FROM")) socket.write("250 ok\r\n");
        else if (upper.startsWith("RCPT TO")) socket.write("250 ok\r\n");
        else if (upper === "DATA") { dataMode = true; socket.write("354 go\r\n"); }
        else if (upper === "QUIT") { socket.write("221 bye\r\n"); socket.end(); }
        else socket.write("250 ok\r\n");
      }
    } else if (buffer.includes("\r\n.\r\n")) {
      message = buffer.slice(0, buffer.indexOf("\r\n.\r\n"));
      writeFileSync("$SMTP_FILE", message);
      dataMode = false;
      buffer = "";
      socket.write("250 queued\r\n");
    }
  });
});
server.listen($SMTP_PORT, "127.0.0.1");
EOF
PIDS+=("$!")
sleep 0.3

SMTP_ENV="$(mktemp)"
printf 'ALLOWED_ORIGINS=%s\nSMTP_HOST=127.0.0.1\nSMTP_PORT=%s\nSMTP_TLS=none\nSMTP_FROM=site@emersol.test\nCONTACT_TO=inbox@emersol.test\nRATELIMIT_DIR=%s\nRATELIMIT_MAX=20\n' \
  "$ORIGIN" "$SMTP_PORT" "$(mktemp -d)" > "$SMTP_ENV"
start_php "$SMTP_ENV"
code="$(post "$VALID")"
[[ "$code" == "200" ]] || { echo "smtp expected 200, got $code $(cat "$BODY_FILE")"; cat /tmp/emersol-php.log >&2 || true; exit 1; }
grep -q '"ok":true' "$BODY_FILE"
grep -q 'Oficina Norte' "$SMTP_FILE"
grep -q 'Reply-To: <ana.silva@example.com>' "$SMTP_FILE"

echo "contact endpoint ok"
