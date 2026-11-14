<?php
/**
 * Entrega real do formulário. Não confirma envio sem webhook ou SMTP.
 * Segredos vêm do ambiente ou de um .env fora do docroot.
 * Nunca coloque este arquivo para devolver sucesso simulado.
 */

declare(strict_types=1);

const COUNTRIES = ['BR', 'PT', 'ES', 'GB', 'IE', 'DE', 'EU', 'OTHER'];
const BUDGETS = ['undefined', 'fixed', 'guided', 'ongoing'];
const TIMELINES = ['asap', 'd30', 'quarter', 'exploring'];
const LOCALES = ['pt', 'en', 'es', 'de'];
const FALLBACK_PATHS = [
    'pt' => '/contato/',
    'en' => '/en/contact/',
    'es' => '/es/contacto/',
    'de' => '/de/kontakt/',
];

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function one_line(string $value): string
{
    return trim(str_replace(["\r", "\n", "\0"], '', $value));
}

function env_file(string $path): array
{
    if (!is_file($path) || !is_readable($path)) {
        return [];
    }
    $out = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        return [];
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $eq = strpos($line, '=');
        if ($eq === false) {
            continue;
        }
        $key = trim(substr($line, 0, $eq));
        $value = trim(substr($line, $eq + 1));
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }
        $out[$key] = $value;
    }
    return $out;
}

function load_env(): array
{
    $keys = [
        'CONTACT_TO', 'WEBHOOK_URL', 'WEBHOOK_SECRET', 'SMTP_HOST', 'SMTP_PORT',
        'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'SMTP_TLS', 'ALLOWED_ORIGINS',
        'TURNSTILE_SECRET', 'RATELIMIT_DIR', 'RATELIMIT_SALT', 'RATELIMIT_MAX',
        'RATELIMIT_WINDOW', 'MIN_SUBMIT_SECONDS', 'TRUST_PROXY', 'EMERSOL_ENV_FILE',
    ];
    $merged = [];
    $paths = [];
    $explicit = getenv('EMERSOL_ENV_FILE');
    if (is_string($explicit) && $explicit !== '') {
        $paths[] = $explicit;
    }
    $root = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if ($root !== '') {
        $paths[] = dirname($root) . '/private/.env';
        $paths[] = dirname($root) . '/.env';
    }
    foreach ($paths as $path) {
        foreach (env_file($path) as $key => $value) {
            if (!isset($merged[$key]) && $value !== '') {
                $merged[$key] = $value;
            }
        }
    }
    foreach ($keys as $key) {
        $fromServer = getenv($key);
        if (is_string($fromServer) && $fromServer !== '') {
            $merged[$key] = $fromServer;
        }
    }
    return $merged;
}

function public_config(): array
{
    $path = dirname(__DIR__) . '/runtime-config.json';
    if (!is_file($path)) {
        return ['email' => '', 'contactPaths' => FALLBACK_PATHS];
    }
    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        return ['email' => '', 'contactPaths' => FALLBACK_PATHS];
    }
    $paths = FALLBACK_PATHS;
    if (isset($decoded['contactPaths']) && is_array($decoded['contactPaths'])) {
        foreach (FALLBACK_PATHS as $locale => $fallback) {
            $candidate = $decoded['contactPaths'][$locale] ?? '';
            if (is_string($candidate) && str_starts_with($candidate, '/') && !str_starts_with($candidate, '//')) {
                $paths[$locale] = $candidate;
            }
        }
    }
    $email = isset($decoded['email']) && is_string($decoded['email']) ? trim($decoded['email']) : '';
    return ['email' => $email, 'contactPaths' => $paths];
}

function wants_json(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return str_contains($accept, 'application/json');
}

function send_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function send_html(string $locale, string $title, string $body, string $back, string $href, int $status): void
{
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    $lang = $locale === 'pt' ? 'pt-BR' : $locale;
    echo '<!doctype html><html lang="' . h($lang) . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'
        . h($title) . '</title></head><body style="margin:0;padding:2rem;background:#f3f0e8;color:#1a1c17;font-family:Georgia,serif">'
        . '<main style="max-width:36rem"><p>Emersol.ai</p><h1>' . h($title) . '</h1><p>' . h($body)
        . '</p><p><a href="' . h($href) . '">' . h($back) . '</a></p></main></body></html>';
    exit;
}

function ui(string $locale): array
{
    $all = [
        'pt' => [
            'back' => 'Voltar ao formulário',
            'successTitle' => 'Mensagem enviada',
            'successBody' => 'O pedido chegou ao destino configurado. Emerson responde no e-mail informado, para combinar a conversa.',
            'validation' => 'Revise os campos. Nada foi enviado.',
            'rejected' => 'Não foi possível enviar este pedido.',
            'rate_limited' => 'Muitos envios em pouco tempo. Espere e tente de novo.',
            'not_configured' => 'O formulário ainda não está ligado a um destino. Nada foi enviado e isto não é uma confirmação.',
            'delivery_failed' => 'A entrega falhou no servidor. Nada foi confirmado.',
            'fallback' => 'Você pode escrever diretamente para',
        ],
        'en' => [
            'back' => 'Back to the form',
            'successTitle' => 'Message sent',
            'successBody' => 'The request reached the configured destination. Emerson replies to the email address you gave, to arrange the conversation.',
            'validation' => 'Check the fields. Nothing was sent.',
            'rejected' => 'This request could not be sent.',
            'rate_limited' => 'Too many sends in a short time. Wait and try again.',
            'not_configured' => 'The form is not connected to a destination yet. Nothing was sent, and this is not a confirmation.',
            'delivery_failed' => 'Delivery failed on the server. Nothing was confirmed.',
            'fallback' => 'You can write directly to',
        ],
        'es' => [
            'back' => 'Volver al formulario',
            'successTitle' => 'Mensaje enviado',
            'successBody' => 'La solicitud llegó al destino configurado. Emerson responde al correo que indicaste para concertar la conversación.',
            'validation' => 'Revisa los campos. No se ha enviado nada.',
            'rejected' => 'No se ha podido enviar esta solicitud.',
            'rate_limited' => 'Demasiados envíos en poco tiempo. Espera y vuelve a intentarlo.',
            'not_configured' => 'El formulario todavía no está conectado a un destino. No se ha enviado nada y esto no es una confirmación.',
            'delivery_failed' => 'La entrega falló en el servidor. No hay nada confirmado.',
            'fallback' => 'Puedes escribir directamente a',
        ],
        'de' => [
            'back' => 'Zurück zum Formular',
            'successTitle' => 'Nachricht gesendet',
            'successBody' => 'Die Anfrage hat das eingerichtete Ziel erreicht. Emerson antwortet an die angegebene E-Mail-Adresse, um das Gespräch zu verabreden.',
            'validation' => 'Bitte prüfen Sie die Felder. Es wurde nichts gesendet.',
            'rejected' => 'Diese Anfrage konnte nicht gesendet werden.',
            'rate_limited' => 'Zu viele Sendungen in kurzer Zeit. Warten Sie und versuchen Sie es erneut.',
            'not_configured' => 'Das Formular ist noch mit keinem Ziel verbunden. Es wurde nichts gesendet, und das ist keine Bestätigung.',
            'delivery_failed' => 'Die Zustellung auf dem Server ist fehlgeschlagen. Nichts wurde bestätigt.',
            'fallback' => 'Sie können direkt schreiben an',
        ],
    ];
    return $all[$locale] ?? $all['pt'];
}

function fail(string $locale, string $code, int $status, array $fields, array $config): void
{
    $copy = ui($locale);
    $paths = $config['contactPaths'];
    $href = $paths[$locale] ?? '/contato/';
    $email = $config['email'];
    $body = $copy[$code] ?? $copy['rejected'];
    if (in_array($code, ['not_configured', 'delivery_failed', 'rejected', 'rate_limited'], true) && $email !== '') {
        $body .= ' ' . $copy['fallback'] . ' ' . $email . '.';
    }
    if (wants_json()) {
        $payload = ['ok' => false, 'error' => $code];
        if ($fields !== []) {
            $payload['fields'] = $fields;
        }
        send_json($status, $payload);
    }
    send_html($locale, $body, $body, $copy['back'], $href, $status);
}

function client_ip(array $env): string
{
    if (($env['TRUST_PROXY'] ?? '') === '1') {
        $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        $first = trim(explode(',', $forwarded)[0] ?? '');
        if ($first !== '') {
            return $first;
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function limited(array $env, string $ip): bool
{
    $max = max(1, (int) ($env['RATELIMIT_MAX'] ?? 5));
    $window = max(60, (int) ($env['RATELIMIT_WINDOW'] ?? 3600));
    $dir = $env['RATELIMIT_DIR'] ?? '';
    if ($dir === '') {
        $root = $_SERVER['DOCUMENT_ROOT'] ?? '';
        $candidate = $root !== '' ? dirname($root) . '/private/ratelimit' : '';
        $dir = ($candidate !== '' && (is_dir(dirname($candidate)) && is_writable(dirname($candidate))))
            ? $candidate
            : sys_get_temp_dir() . '/emersol-ratelimit';
    }
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        return false;
    }
    $salt = $env['RATELIMIT_SALT'] ?? 'emersol-ratelimit';
    $file = $dir . '/' . hash('sha256', $salt . '|' . $ip) . '.json';
    $now = time();
    $handle = fopen($file, 'c+');
    if ($handle === false) {
        return false;
    }
    flock($handle, LOCK_EX);
    $raw = stream_get_contents($handle);
    $hits = json_decode($raw === false ? '' : $raw, true);
    if (!is_array($hits)) {
        $hits = [];
    }
    $hits = array_values(array_filter($hits, static fn ($time) => is_int($time) && $time > $now - $window));
    $blocked = count($hits) >= $max;
    if (!$blocked) {
        $hits[] = $now;
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($hits));
    }
    flock($handle, LOCK_UN);
    fclose($handle);
    return $blocked;
}

function origin_ok(array $env): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return true;
    }
    $allowed = array_values(array_filter(array_map('trim', explode(',', $env['ALLOWED_ORIGINS'] ?? 'https://emersol.ai'))));
    return in_array($origin, $allowed, true);
}

function http_exchange(string $url, string $body, array $headers): array
{
    $parts = parse_url($url);
    if ($parts === false || empty($parts['host']) || empty($parts['scheme'])) {
        throw new RuntimeException('bad_url');
    }
    $scheme = strtolower($parts['scheme']);
    $host = $parts['host'];
    $port = (int) ($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
    $path = ($parts['path'] ?? '/') . (isset($parts['query']) ? '?' . $parts['query'] : '');
    $remote = ($scheme === 'https' ? 'ssl://' : '') . $host . ':' . $port;
    $context = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $fp = stream_socket_client($remote, $errno, $errstr, 12, STREAM_CLIENT_CONNECT, $context);
    if ($fp === false) {
        throw new RuntimeException('connect');
    }
    stream_set_timeout($fp, 12);
    $hostHeader = $host;
    if (!(($scheme === 'https' && $port === 443) || ($scheme === 'http' && $port === 80))) {
        $hostHeader .= ':' . $port;
    }
    $request = "POST {$path} HTTP/1.0\r\nHost: {$hostHeader}\r\nContent-Length: " . strlen($body) . "\r\nConnection: close\r\n";
    foreach ($headers as $header) {
        $request .= $header . "\r\n";
    }
    fwrite($fp, $request . "\r\n" . $body);
    $raw = stream_get_contents($fp);
    fclose($fp);
    if (!is_string($raw) || !preg_match('#HTTP/\d(?:\.\d)?\s+(\d{3})#', $raw, $match)) {
        throw new RuntimeException('status');
    }
    $split = strpos($raw, "\r\n\r\n");
    $responseBody = $split === false ? '' : substr($raw, $split + 4);
    return [(int) $match[1], $responseBody];
}

function webhook_allowed(string $url): bool
{
    $parts = parse_url($url);
    if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
        return false;
    }
    $scheme = strtolower($parts['scheme']);
    $host = strtolower($parts['host']);
    if (in_array($host, ['localhost', '127.0.0.1'], true)) {
        return $scheme === 'http' || $scheme === 'https';
    }
    return $scheme === 'https';
}

function turnstile_ok(array $env, string $token, string $ip): bool
{
    $secret = $env['TURNSTILE_SECRET'] ?? '';
    if ($secret === '') {
        return true;
    }
    if ($token === '') {
        return false;
    }
    [$status, $body] = http_exchange(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        http_build_query(['secret' => $secret, 'response' => $token, 'remoteip' => $ip]),
        ['Content-Type: application/x-www-form-urlencoded']
    );
    if ($status < 200 || $status >= 300) {
        return false;
    }
    $decoded = json_decode($body, true);
    return is_array($decoded) && ($decoded['success'] ?? false) === true;
}

function smtp_read($fp): string
{
    $data = '';
    while (!feof($fp)) {
        $line = fgets($fp, 515);
        if ($line === false) {
            break;
        }
        $data .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return $data;
}

function smtp_expect($fp, array $codes): void
{
    $reply = smtp_read($fp);
    $code = (int) substr($reply, 0, 3);
    if (!in_array($code, $codes, true)) {
        throw new RuntimeException('smtp_' . $code);
    }
}

function smtp_cmd($fp, string $command, array $codes): void
{
    fwrite($fp, $command . "\r\n");
    smtp_expect($fp, $codes);
}

function smtp_send(array $env, string $to, string $replyTo, string $subject, string $body): void
{
    $host = $env['SMTP_HOST'];
    $port = (int) ($env['SMTP_PORT'] ?? 587);
    $mode = strtolower($env['SMTP_TLS'] ?? 'starttls');
    $remote = ($mode === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $context = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $fp = stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $context);
    if ($fp === false) {
        throw new RuntimeException('smtp_connect');
    }
    stream_set_timeout($fp, 15);
    smtp_expect($fp, [220]);
    smtp_cmd($fp, 'EHLO emersol.ai', [250]);
    if ($mode === 'starttls') {
        smtp_cmd($fp, 'STARTTLS', [220]);
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('smtp_tls');
        }
        smtp_cmd($fp, 'EHLO emersol.ai', [250]);
    }
    $user = $env['SMTP_USER'] ?? '';
    if ($user !== '') {
        smtp_cmd($fp, 'AUTH LOGIN', [334]);
        smtp_cmd($fp, base64_encode($user), [334]);
        smtp_cmd($fp, base64_encode($env['SMTP_PASSWORD'] ?? ''), [235]);
    }
    $from = $env['SMTP_FROM'];
    smtp_cmd($fp, 'MAIL FROM:<' . $from . '>', [250]);
    smtp_cmd($fp, 'RCPT TO:<' . $to . '>', [250, 251]);
    smtp_cmd($fp, 'DATA', [354]);
    $safeBody = preg_replace('/^\./m', '..', str_replace(["\r\n", "\r"], "\n", $body));
    $safeBody = str_replace("\n", "\r\n", $safeBody ?? '');
    $headers = [
        'From: <' . $from . '>',
        'To: <' . $to . '>',
        'Reply-To: <' . $replyTo . '>',
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'Date: ' . date(DATE_RFC2822),
    ];
    fwrite($fp, implode("\r\n", $headers) . "\r\n\r\n" . $safeBody . "\r\n.\r\n");
    smtp_expect($fp, [250]);
    fwrite($fp, "QUIT\r\n");
    fclose($fp);
}

$env = load_env();
$config = public_config();
$length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    send_json(405, ['ok' => false, 'error' => 'method']);
}
if ($length > 100000) {
    send_json(413, ['ok' => false, 'error' => 'validation']);
}

$ctype = $_SERVER['CONTENT_TYPE'] ?? '';
if (str_contains($ctype, 'application/json')) {
    $raw = file_get_contents('php://input');
    $data = json_decode(is_string($raw) ? $raw : '', true);
    if (!is_array($data)) {
        $data = [];
    }
} else {
    $data = $_POST;
}

$locale = isset($data['locale']) && in_array($data['locale'], LOCALES, true) ? $data['locale'] : 'pt';

if (!origin_ok($env)) {
    fail($locale, 'rejected', 400, [], $config);
}

$honeypot = trim((string) ($data['company_fax'] ?? ''));
if ($honeypot !== '') {
    fail($locale, 'rejected', 400, [], $config);
}

$started = (int) ($data['started_at'] ?? 0);
if ($started > 0) {
    $nowMs = (int) round(microtime(true) * 1000);
    $minMs = max(0, (int) ($env['MIN_SUBMIT_SECONDS'] ?? 3)) * 1000;
    if ($started > $nowMs + 120000 || $nowMs - $started < $minMs || $nowMs - $started > 12 * 3600 * 1000) {
        fail($locale, 'rejected', 400, [], $config);
    }
}

$fields = [];
$name = one_line((string) ($data['name'] ?? ''));
$company = one_line((string) ($data['company'] ?? ''));
$email = one_line((string) ($data['email'] ?? ''));
$country = (string) ($data['country'] ?? '');
$website = one_line((string) ($data['website'] ?? ''));
$phone = one_line((string) ($data['phone'] ?? ''));
$problem = trim((string) ($data['problem'] ?? ''));
$budget = (string) ($data['budget'] ?? '');
$timeline = (string) ($data['timeline'] ?? '');
$consent = (string) ($data['consent'] ?? '');

if (strlen($name) < 2 || strlen($name) > 120) {
    $fields[] = 'name';
}
if (strlen($company) < 2 || strlen($company) > 160) {
    $fields[] = 'company';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 160) {
    $fields[] = 'email';
}
if (!in_array($country, COUNTRIES, true)) {
    $fields[] = 'country';
}
if ($website !== '' && (strlen($website) > 200 || preg_match('/\s|[<>]/', $website))) {
    $fields[] = 'website';
}
if ($phone !== '' && (strlen($phone) > 40 || !preg_match('/^[0-9+().\-\s]+$/', $phone))) {
    $fields[] = 'phone';
}
if (strlen($problem) < 10 || strlen($problem) > 4000) {
    $fields[] = 'problem';
}
if (!in_array($budget, BUDGETS, true)) {
    $fields[] = 'budget';
}
if (!in_array($timeline, TIMELINES, true)) {
    $fields[] = 'timeline';
}
if (!in_array($consent, ['yes', 'on', '1', 'true'], true)) {
    $fields[] = 'consent';
}
if ($fields !== []) {
    fail($locale, 'validation', 400, $fields, $config);
}

$token = one_line((string) ($data['cf-turnstile-response'] ?? ''));
if (!turnstile_ok($env, $token, client_ip($env))) {
    fail($locale, 'rejected', 400, [], $config);
}

if (limited($env, client_ip($env))) {
    fail($locale, 'rate_limited', 429, [], $config);
}

$payload = [
    'source' => 'emersol.ai',
    'receivedAt' => gmdate('c'),
    'locale' => $locale,
    'name' => $name,
    'company' => $company,
    'email' => $email,
    'country' => $country,
    'website' => $website,
    'phone' => $phone,
    'problem' => $problem,
    'budget' => $budget,
    'timeline' => $timeline,
    'consent' => true,
];

$delivered = 0;
$attempted = 0;
$webhook = $env['WEBHOOK_URL'] ?? '';
if ($webhook !== '') {
    $attempted++;
    try {
        if (!webhook_allowed($webhook)) {
            throw new RuntimeException('webhook_scheme');
        }
        $headers = ['Content-Type: application/json', 'User-Agent: EmersolSite/1.0'];
        $secret = one_line($env['WEBHOOK_SECRET'] ?? '');
        if ($secret !== '') {
            $headers[] = 'X-Webhook-Secret: ' . $secret;
        }
        [$status] = http_exchange($webhook, json_encode($payload, JSON_UNESCAPED_UNICODE), $headers);
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('webhook_status');
        }
        $delivered++;
    } catch (Throwable $exception) {
        error_log('emersol contact webhook failed');
    }
}

$smtpHost = $env['SMTP_HOST'] ?? '';
$smtpFrom = $env['SMTP_FROM'] ?? '';
$contactTo = $env['CONTACT_TO'] ?? '';
if ($smtpHost !== '' && $smtpFrom !== '' && $contactTo !== '') {
    $attempted++;
    try {
        if (!filter_var($smtpFrom, FILTER_VALIDATE_EMAIL) || !filter_var($contactTo, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('smtp_addr');
        }
        $subject = 'Pedido de conversa — ' . $company;
        $text = "Novo pedido de conversa — emersol.ai\n"
            . "Locale: {$locale}\n"
            . "Nome: {$name}\n"
            . "Empresa: {$company}\n"
            . "E-mail: {$email}\n"
            . "País: {$country}\n"
            . "Site: {$website}\n"
            . "Telefone: {$phone}\n"
            . "Faixa: {$budget}\n"
            . "Prazo: {$timeline}\n\n"
            . $problem . "\n";
        smtp_send($env, $contactTo, $email, one_line($subject), $text);
        $delivered++;
    } catch (Throwable $exception) {
        error_log('emersol contact smtp failed');
    }
}

if ($attempted === 0) {
    fail($locale, 'not_configured', 503, [], $config);
}
if ($delivered === 0) {
    fail($locale, 'delivery_failed', 502, [], $config);
}

$copy = ui($locale);
$href = $config['contactPaths'][$locale] ?? '/contato/';
if (wants_json()) {
    send_json(200, ['ok' => true]);
}
send_html($locale, $copy['successTitle'], $copy['successBody'], $copy['back'], $href, 200);
