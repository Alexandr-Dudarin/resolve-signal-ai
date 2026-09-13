# ResolveSignal AI — Troubleshooting

## OpenAI API TLS on Windows / Node.js

### Symptom

OpenAI SDK or Node.js `fetch()` fails with:

```text
SELF_SIGNED_CERT_IN_CHAIN
APIConnectionError: Connection error
```

Example:

```text
Error: self-signed certificate in certificate chain
code: SELF_SIGNED_CERT_IN_CHAIN
```

### Cause

On Windows, a trusted certificate may exist in the Windows system certificate store
but not in the CA set used by Node.js.

This may happen with local HTTPS inspection, antivirus software, VPN/proxy software,
or other certificates trusted by Windows.

### Safe fix

ResolveSignal was verified with Node.js 24 using the Windows system CA store:

```powershell
[Environment]::SetEnvironmentVariable(
  "NODE_USE_SYSTEM_CA",
  "1",
  "User"
)
```

Restart VS Code / PowerShell after setting the variable.

Verify:

```powershell
$env:NODE_USE_SYSTEM_CA
```

Expected:

```text
1
```

Then test HTTPS without using an API key:

```powershell
node -e "fetch('https://api.openai.com/v1/models').then(r => console.log('HTTP status:', r.status)).catch(e => console.error(e.cause ?? e))"
```

An HTTP response such as `401` is expected when no API key is supplied.
It confirms that TLS negotiation succeeded.

### Do not disable TLS verification

Do not use:

```text
NODE_TLS_REJECT_UNAUTHORIZED=0
```

That disables certificate verification and is not an acceptable fix.

---

## Local PostgreSQL

ResolveSignal uses PostgreSQL in Docker.

Local mapping:

```text
localhost:5434 -> container:5432
```

Container:

```text
resolve-signal-ai-postgres-1
```

If Dashboard data cannot load or feedback cannot be created, first make sure
Docker Desktop is running.

Start the database:

```powershell
docker compose up -d
```

Check status:

```powershell
docker compose ps
```

The PostgreSQL container should be `healthy`.

Then start the application:

```powershell
pnpm dev
```

Expected local services:

```text
Web: http://localhost:5173
API: http://localhost:4000
Swagger: http://localhost:4000/api/docs
```

---

## OpenAI live mode

Local `.env` configuration:

```text
AI_PROVIDER="openai"
OPENAI_API_KEY="<secret>"
OPENAI_MODEL="gpt-5.6-luna"
```

The real `.env` file must never be committed.

For free development/demo mode:

```text
AI_PROVIDER="mock"
```

The public `.env.example` contains placeholders only.