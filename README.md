# Consorcio Expensas

Automated email notification system for building administrators. Sends monthly expense reports, power outage notices, and general announcements to unit owners and tenants — with PDF attachments, Excel-based contact management, and real-time sending progress.

## What It Does

- **Three notification types**: monthly expenses (with PDF attachments), power cut notices, and general announcements
- **Multi-building management** — each building has its own sender identity, units, and send history
- **Excel-based contacts** — upload spreadsheets with unit data (apartment, owner name, email)
- **PDF validation** — verifies expense PDFs exist before sending (format: `Expensas [N].pdf` + `Detalle expensas [N].pdf`)
- **HTML template editor** — customize email templates with variable interpolation (`{mes_expensas}`, `{nombre}`, `{depto}`)
- **Real-time progress** — Server-Sent Events (SSE) stream per-email status with cancel support
- **Test mode** — send to 1, 5, or all recipients to avoid Gmail rate limits
- **Send history** — logs all sends with success/error counts per building

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19, Tailwind CSS 4 |
| Database | SQLite (better-sqlite3) |
| Email | Gmail API (OAuth2) via Python subprocess |
| Excel | xlsx library |
| Rich Text | TipTap editor |
| Icons | Lucide React |
| Testing | Vitest + Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.8+ with `pip install google-auth-oauthlib google-api-python-client openpyxl pandas`
- Google Cloud project with Gmail API enabled + OAuth2 Desktop credentials

### Setup

```bash
# Install dependencies
npm install

# Place your Google OAuth credentials
cp credentials.json .    # Download from Google Cloud Console

# Start dev server (localhost:3000)
npm run dev

# First email send will open browser for Gmail authorization
# token.pickle is generated automatically after auth
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run test` | Run tests (Vitest) |
| `npm run lint` | Run ESLint |

## Architecture

```
┌────────────────────────────────────────────────────┐
│              Next.js Frontend (SPA)                 │
│  Building selector │ Excel upload │ Template editor  │
│  PDF validation │ Send progress │ History            │
└──────────────────────┬─────────────────────────────┘
                       │ REST API + SSE
┌──────────────────────┴─────────────────────────────┐
│              Next.js API Routes                     │
│  /api/buildings  /api/excel  /api/enviar            │
│  /api/templates  /api/unidades  /api/validate-pdfs  │
└──────┬───────────────────────────────┬─────────────┘
       │                               │
       ▼                               ▼
    SQLite                    Python subprocess
  (better-sqlite3)           (Gmail API + OAuth2)
  buildings, units,          Send emails with
  send history               PDF attachments
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `BuildingsManager` | CRUD for buildings with sender identity |
| `ExcelDataViewer` | Upload and preview unit spreadsheets |
| `TemplateEditor` | HTML email template editing with TipTap |
| `SendingProgress` | Real-time SSE progress with cancel |
| `ConfirmationModal` | Pre-send review with recipient count |
| `EnviosHistorial` | Send history with filters |

### Email Flow

1. Select building and action type (expenses/power cut/announcement)
2. Upload Excel with unit contacts
3. Validate PDFs exist (expenses only)
4. Review in confirmation modal
5. POST to `/api/enviar` spawns Python subprocess
6. Python sends via Gmail API, streams progress via SSE
7. Results logged to `envios_log` table

## Configuration

No `.env` file needed. Configuration via:
- `credentials.json` — Google OAuth client (gitignored)
- `token.pickle` — Gmail access token, auto-generated (gitignored)
- `data/consorcio.db` — SQLite database (gitignored)
- `templates/` — HTML email templates (expensas, corte_luz, aviso_general, firma)

## License

MIT
