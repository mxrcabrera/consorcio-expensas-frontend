# Desktop Client Setup (Tauri + SQLite)

Guía para configurar y desarrollar el cliente desktop standalone usando Tauri 2.x con SQLite local.

## Overview

El cliente desktop es una aplicación **standalone** que almacena todos los datos localmente en SQLite. No requiere conexión a internet excepto para enviar emails.

```
┌────────────────────────────────────────┐
│           Tauri App (Windows)          │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │     React App (WebView2)         │  │
│  │     - UI components              │  │
│  │     - State management           │  │
│  └──────────────────────────────────┘  │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │     Rust Backend                 │  │
│  │     - SQLite (embedded)          │  │
│  │     - File system access         │  │
│  │     - PDF generation             │  │
│  │     - Auto-updater               │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
         │
         │ SMTP/API (only for emails)
         ▼
    Resend / SMTP Server
```

### Características Clave

| Aspecto | Desktop Standalone |
|---------|-------------------|
| **Datos** | SQLite local (archivo .db) |
| **Autenticación** | No requiere (app local) |
| **Conexión** | Solo para emails |
| **Tenancy** | Single-tenant (un consorcio) |
| **PDFs** | Guardados en filesystem local |
| **Costo** | Gratis, sin límites |

---

## Tauri vs Electron

| Aspecto | Tauri 2.x | Electron |
|---------|-----------|----------|
| **Installer size** | ~15MB | ~150MB |
| **RAM usage** | ~50MB | ~300MB+ |
| **Backend** | Rust | Node.js |
| **WebView** | OS native (WebView2) | Bundled Chromium |
| **SQLite** | rusqlite (nativo) | better-sqlite3 |
| **Security** | Strict sandbox | Needs config |

**Decisión**: Tauri por tamaño, performance y acceso nativo a SQLite via Rust.

---

## Prerequisites

### Windows

1. **WebView2 Runtime** (viene con Windows 10/11 moderno)
   ```powershell
   # Verificar instalación
   Get-ItemProperty -Path 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -Name pv
   ```

2. **Rust toolchain**
   ```bash
   # Instalar rustup (https://rustup.rs)
   # En Windows, descargar rustup-init.exe
   ```

3. **Visual Studio Build Tools**
   - Descargar [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Instalar "Desktop development with C++"

4. **Node.js 18+** y **pnpm**
   ```bash
   npm install -g pnpm
   ```

### Verificar instalación

```bash
rustc --version    # >= 1.70
cargo --version
node --version     # >= 18
pnpm --version
```

---

## Project Structure

```
consorcio-saas/
├── apps/
│   └── desktop/                    # Tauri app (PRIMARY)
│       ├── src/
│       │   ├── App.tsx             # React entry point
│       │   ├── main.tsx
│       │   ├── pages/              # App pages
│       │   ├── components/         # UI components
│       │   └── lib/
│       │       └── tauri.ts        # Tauri API bindings
│       ├── src-tauri/
│       │   ├── src/
│       │   │   ├── main.rs         # Rust entry point
│       │   │   ├── db.rs           # SQLite operations
│       │   │   ├── commands.rs     # Tauri commands
│       │   │   └── pdf.rs          # PDF generation
│       │   ├── migrations/         # SQLite migrations
│       │   ├── tauri.conf.json
│       │   └── Cargo.toml
│       └── package.json
├── packages/
│   ├── ui/                         # Shared React components
│   ├── lib/                        # Shared utilities
│   └── types/                      # TypeScript interfaces
└── pnpm-workspace.yaml
```

---

## Data Layer: SQLite

### Database Location

```
Windows: %APPDATA%\com.consorcio.expensas\data.db
```

### Schema (migrations/001_initial.sql)

```sql
-- Consorcio (single tenant)
CREATE TABLE consorcio (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  cuit TEXT,
  config TEXT -- JSON for CBU, alias, etc
);

-- Unidades
CREATE TABLE unidades (
  id INTEGER PRIMARY KEY,
  numero_uf INTEGER NOT NULL UNIQUE,
  piso_depto TEXT NOT NULL,
  tipo TEXT NOT NULL, -- DEPARTAMENTO, COCHERA, LOCAL, BAULERA
  metros_cuadrados REAL,
  coef_fiscal REAL,
  propietario_nombre TEXT,
  propietario_email TEXT,
  inquilino_nombre TEXT,
  inquilino_email TEXT
);

-- Conceptos de gasto
CREATE TABLE conceptos (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  tipo_prorrateo TEXT NOT NULL DEFAULT 'por_coef',
  categoria TEXT NOT NULL DEFAULT 'A',
  orden INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1
);

-- Periodos
CREATE TABLE periodos (
  id INTEGER PRIMARY KEY,
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  fecha_cierre TEXT,
  fecha_vto_1 TEXT,
  fecha_vto_2 TEXT,
  recargo_vto_1 REAL DEFAULT 10.0,
  recargo_vto_2 REAL DEFAULT 20.0,
  estado TEXT DEFAULT 'borrador',
  notas TEXT,
  UNIQUE(mes, anio)
);

-- Gastos del periodo
CREATE TABLE gastos_periodo (
  id INTEGER PRIMARY KEY,
  periodo_id INTEGER NOT NULL REFERENCES periodos(id),
  concepto_id INTEGER NOT NULL REFERENCES conceptos(id),
  proveedor TEXT,
  descripcion TEXT,
  monto REAL NOT NULL,
  comprobante_path TEXT,
  fecha TEXT
);

-- Liquidaciones por unidad
CREATE TABLE liquidaciones (
  id INTEGER PRIMARY KEY,
  periodo_id INTEGER NOT NULL REFERENCES periodos(id),
  unidad_id INTEGER NOT NULL REFERENCES unidades(id),
  total_expensas_a REAL DEFAULT 0,
  total_expensas_b REAL DEFAULT 0,
  total_extraordinarias REAL DEFAULT 0,
  saldo_anterior REAL DEFAULT 0,
  pagos_periodo REAL DEFAULT 0,
  ajustes REAL DEFAULT 0,
  total_a_pagar REAL GENERATED ALWAYS AS (
    total_expensas_a + total_expensas_b + total_extraordinarias +
    saldo_anterior - pagos_periodo + ajustes
  ) STORED,
  estado_pago TEXT DEFAULT 'pendiente',
  pdf_path TEXT,
  UNIQUE(periodo_id, unidad_id)
);

-- Items de liquidacion
CREATE TABLE items_liquidacion (
  id INTEGER PRIMARY KEY,
  liquidacion_id INTEGER NOT NULL REFERENCES liquidaciones(id),
  concepto_id INTEGER NOT NULL REFERENCES conceptos(id),
  descripcion TEXT,
  monto REAL NOT NULL
);

-- Pagos registrados
CREATE TABLE pagos (
  id INTEGER PRIMARY KEY,
  unidad_id INTEGER NOT NULL REFERENCES unidades(id),
  liquidacion_id INTEGER REFERENCES liquidaciones(id),
  fecha TEXT NOT NULL,
  monto REAL NOT NULL,
  medio_pago TEXT,
  referencia TEXT,
  comprobante_path TEXT,
  verificado INTEGER DEFAULT 0
);

-- Historial de envios
CREATE TABLE envios_email (
  id INTEGER PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'expensas', 'aviso_general'
  periodo_id INTEGER REFERENCES periodos(id),
  destinatarios INTEGER NOT NULL,
  enviados_ok INTEGER DEFAULT 0,
  enviados_error INTEGER DEFAULT 0,
  fecha TEXT NOT NULL,
  asunto TEXT
);

-- Indices
CREATE INDEX idx_gastos_periodo ON gastos_periodo(periodo_id);
CREATE INDEX idx_liquidaciones_periodo ON liquidaciones(periodo_id);
CREATE INDEX idx_pagos_unidad ON pagos(unidad_id);
```

### Rust SQLite Integration

```toml
# Cargo.toml
[dependencies]
tauri = { version = "2", features = ["devtools"] }
rusqlite = { version = "0.31", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```rust
// src-tauri/src/db.rs
use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub fn get_db_path() -> PathBuf {
    let app_data = dirs::data_dir().unwrap();
    app_data.join("com.consorcio.expensas").join("data.db")
}

pub fn init_db() -> Result<Connection> {
    let db_path = get_db_path();
    std::fs::create_dir_all(db_path.parent().unwrap())?;

    let conn = Connection::open(&db_path)?;

    // Run migrations
    conn.execute_batch(include_str!("../migrations/001_initial.sql"))?;

    Ok(conn)
}

#[tauri::command]
pub fn get_unidades() -> Result<Vec<Unidad>, String> {
    let conn = init_db().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT * FROM unidades ORDER BY numero_uf")
        .map_err(|e| e.to_string())?;

    let unidades = stmt.query_map([], |row| {
        Ok(Unidad {
            id: row.get(0)?,
            numero_uf: row.get(1)?,
            piso_depto: row.get(2)?,
            // ...
        })
    }).map_err(|e| e.to_string())?;

    unidades.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
```

---

## Tauri Commands (IPC)

### Frontend → Rust

```typescript
// src/lib/tauri.ts
import { invoke } from '@tauri-apps/api/core';

// Unidades
export const getUnidades = () => invoke<Unidad[]>('get_unidades');
export const createUnidad = (data: UnidadInput) => invoke('create_unidad', { data });
export const updateUnidad = (id: number, data: UnidadInput) => invoke('update_unidad', { id, data });
export const deleteUnidad = (id: number) => invoke('delete_unidad', { id });

// Periodos
export const getPeriodos = () => invoke<Periodo[]>('get_periodos');
export const createPeriodo = (mes: number, anio: number) => invoke('create_periodo', { mes, anio });
export const cerrarPeriodo = (id: number) => invoke('cerrar_periodo', { id });

// Liquidaciones
export const calcularLiquidaciones = (periodoId: number) => invoke('calcular_liquidaciones', { periodoId });
export const generarPdf = (liquidacionId: number) => invoke<string>('generar_pdf', { liquidacionId });

// Emails
export const enviarExpensas = (periodoId: number, config: EmailConfig) =>
  invoke('enviar_expensas', { periodoId, config });
```

### Rust Commands

```rust
// src-tauri/src/commands.rs
use tauri::command;

#[command]
pub fn get_unidades() -> Result<Vec<Unidad>, String> {
    db::get_unidades()
}

#[command]
pub fn create_unidad(data: UnidadInput) -> Result<i64, String> {
    db::insert_unidad(&data)
}

#[command]
pub fn calcular_liquidaciones(periodo_id: i64) -> Result<(), String> {
    liquidacion::calcular_periodo(periodo_id)
}

#[command]
pub fn generar_pdf(liquidacion_id: i64) -> Result<String, String> {
    pdf::generar_liquidacion(liquidacion_id)
}

#[command]
pub async fn enviar_expensas(periodo_id: i64, config: EmailConfig) -> Result<EnvioResult, String> {
    email::enviar_periodo(periodo_id, &config).await
}
```

---

## PDF Generation

### Local PDF Storage

```
Windows: %APPDATA%\com.consorcio.expensas\pdfs\
         └── 2026-01\
             ├── UF01_Expensas_Enero_2026.pdf
             ├── UF02_Expensas_Enero_2026.pdf
             └── ...
```

### Options for PDF Generation

| Option | Pros | Cons |
|--------|------|------|
| **printpdf (Rust)** | Native, fast | Limited styling |
| **wkhtmltopdf** | Full HTML/CSS | External binary |
| **@react-pdf/renderer** | React components | Needs Node runtime |

**Recomendación**: Usar printpdf para PDFs simples o empaquetar wkhtmltopdf para templates HTML.

---

## Email Configuration

### SMTP Settings

Los emails se envían via SMTP (Resend o servidor propio). La configuración se guarda en la DB.

```sql
-- En tabla consorcio.config (JSON)
{
  "email": {
    "provider": "resend", -- or "smtp"
    "resend_api_key": "re_xxxxx",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "user@gmail.com",
    "smtp_password": "app_password",
    "from_name": "Consorcio Constitución 2226",
    "from_email": "expensas@consorcio.com"
  }
}
```

### Rust Email Client

```toml
# Cargo.toml
[dependencies]
lettre = "0.11"
reqwest = { version = "0.11", features = ["json"] }
```

```rust
// src-tauri/src/email.rs
use lettre::{Message, SmtpTransport, Transport};

pub async fn send_email(to: &str, subject: &str, html: &str, attachment: Option<&[u8]>) -> Result<(), String> {
    let config = get_email_config()?;

    match config.provider.as_str() {
        "resend" => send_via_resend(to, subject, html, attachment, &config).await,
        "smtp" => send_via_smtp(to, subject, html, attachment, &config),
        _ => Err("Provider no soportado".into())
    }
}
```

---

## Development

### Initial Setup

```bash
# Clone and install
git clone <repo>
cd consorcio-saas
pnpm install

# Start desktop in dev mode
cd apps/desktop
pnpm tauri dev
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm tauri dev` | Start dev server with hot reload |
| `pnpm tauri build` | Build production installer |
| `pnpm tauri icon` | Generate icons from source |

---

## Configuration

### tauri.conf.json

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Consorcio Expensas",
  "version": "1.0.0",
  "identifier": "com.consorcio.expensas",
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Consorcio Expensas",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installMode": "currentUser",
        "languages": ["Spanish", "English"]
      }
    }
  },
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.consorcio-expensas.com/{{target}}/{{arch}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

### Cargo.toml

```toml
[package]
name = "consorcio-desktop"
version = "1.0.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["devtools"] }
tauri-plugin-updater = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
rusqlite = { version = "0.31", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
lettre = "0.11"
reqwest = { version = "0.11", features = ["json"] }
dirs = "5"
chrono = "0.4"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

---

## File System Access

### Tauri Plugins Required

```json
// tauri.conf.json
{
  "plugins": {
    "fs": {
      "scope": ["$APPDATA/**", "$DOCUMENT/**"]
    },
    "dialog": {
      "open": true,
      "save": true
    }
  }
}
```

### Allowed Paths

| Path | Usage |
|------|-------|
| `$APPDATA/com.consorcio.expensas/` | SQLite DB, PDFs, config |
| `$DOCUMENT/Expensas/` | Exported reports |

---

## Building for Production

### Windows Installer (NSIS)

```bash
# Build release
pnpm tauri build

# Output:
# target/release/bundle/nsis/Consorcio Expensas_1.0.0_x64-setup.exe
```

### What's Included

- Tauri runtime (~15MB)
- SQLite (bundled in rusqlite)
- React app
- Auto-updater

---

## Migration from Web SaaS Version

Si en el futuro se necesita migrar datos del desktop a la versión cloud:

```typescript
// Export local data to JSON
const exportData = async () => {
  const data = {
    consorcio: await invoke('get_consorcio'),
    unidades: await invoke('get_unidades'),
    conceptos: await invoke('get_conceptos'),
    periodos: await invoke('get_periodos'),
    // ... etc
  };

  // Save to file
  await save({ filters: [{ name: 'JSON', extensions: ['json'] }] });
};
```

---

## Troubleshooting

### WebView2 not found

```bash
# Download WebView2 Runtime
# https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

### SQLite database locked

```rust
// Use a single connection or connection pool
// Don't open multiple connections from different threads
```

### Rust compilation errors

```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
pnpm tauri build
```

---

## Changelog

### v1.0.0 (Current)
- SQLite local database
- Full CRUD operations via Tauri commands
- PDF generation and local storage
- Email sending via SMTP/Resend
- Windows installer (NSIS)
- Auto-updates support