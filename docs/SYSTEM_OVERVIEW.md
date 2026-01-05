# Consorcio Expensas - Documentación Técnica

Sistema de gestión y envío automatizado de comunicaciones para consorcios de edificios.

---

## 1. Stack Tecnológico

### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js | 16.0.0 | Framework React con App Router |
| React | 19.2.0 | Librería UI |
| TypeScript | ^5 | Tipado estático |
| Tailwind CSS | ^4 | Estilos utility-first |

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js API Routes | - | Endpoints REST |
| Python | 3.x | Motor de envío de emails |
| better-sqlite3 | ^12.5.0 | Base de datos local |

### Servicios Externos
| Servicio | Propósito |
|----------|-----------|
| Gmail API (OAuth2) | Envío de emails |
| Google Cloud Console | Credenciales OAuth |

### Librerías Principales
| Librería | Propósito |
|----------|-----------|
| `lucide-react` | Iconos |
| `xlsx` | Parseo de archivos Excel |
| `clsx` + `tailwind-merge` | Utilidades CSS |
| `pandas` (Python) | Manipulación de datos |
| `google-auth-oauthlib` (Python) | Autenticación Gmail |

---

## 2. Estructura del Proyecto

```
consorcio-expensas-frontend/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Backend)
│   │   ├── buildings/            # CRUD Edificios
│   │   │   ├── route.ts          # GET/POST
│   │   │   └── [id]/route.ts     # GET/PUT/DELETE por ID
│   │   ├── enviar/route.ts       # Envío de emails (streaming)
│   │   ├── envios-log/route.ts   # Historial de envíos
│   │   ├── excel/route.ts        # Parseo de Excel
│   │   ├── templates/route.ts    # CRUD Templates HTML
│   │   ├── unidades/route.ts     # Unidades por edificio
│   │   └── validate-pdfs/route.ts # Validación de PDFs
│   ├── globals.css               # Estilos globales
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Página principal (SPA)
│
├── components/                   # Componentes React
│   ├── Header.tsx                # Header con selector de edificio
│   ├── BuildingsManager.tsx      # Modal ABM de edificios
│   ├── EnviosHistorial.tsx       # Modal historial de envíos
│   ├── TemplateEditor.tsx        # Editor de plantillas HTML
│   ├── ExcelDataViewer.tsx       # Visor de datos Excel
│   ├── ConfirmationModal.tsx     # Modal de confirmación pre-envío
│   ├── SendingProgress.tsx       # Progress de envío con botón cancelar
│   ├── Toast.tsx                 # Notificaciones
│   └── Badge.tsx                 # Badges/tags
│
├── lib/                          # Utilidades y DB
│   ├── db.ts                     # SQLite: conexión + queries
│   └── utils.ts                  # Helpers (cn, progress, etc)
│
├── python/                       # Backend Python
│   ├── expensas.py               # Motor principal de envío
│   └── wrapper.py                # CLI wrapper para Node
│
├── templates/                    # Plantillas HTML de emails
│   ├── expensas.html             # Template expensas mensuales
│   ├── corte_luz.html            # Template aviso corte de luz
│   ├── aviso_general.html        # Template avisos generales
│   └── firma.html                # Firma común a todos
│
├── types/                        # TypeScript types
│   └── index.ts                  # Interfaces y tipos
│
├── data/                         # [gitignored] SQLite DB
│   └── consorcio.db              # Base de datos local
│
├── temp/                         # [gitignored] Archivos temporales
├── logs/                         # [gitignored] Logs de envío
├── edificios/                    # Carpetas por edificio (PDFs, logs)
│
├── credentials.json              # [gitignored] Credenciales Google OAuth
├── token.pickle                  # [gitignored] Token Gmail
│
├── package.json                  # Dependencias Node
├── tsconfig.json                 # Config TypeScript
└── .gitignore                    # Archivos ignorados
```

### Convenciones de Naming
- **Componentes**: PascalCase (`BuildingsManager.tsx`)
- **API Routes**: kebab-case (`envios-log/route.ts`)
- **Funciones**: camelCase (`getEdificioById`)
- **Tipos/Interfaces**: PascalCase (`ConfigState`, `Edificio`)
- **Constantes**: SCREAMING_SNAKE_CASE (`MESES`, `EMAIL_TEST`)

### Patrones Utilizados
- **API Routes**: Next.js App Router (no Server Actions)
- **Estado**: React useState/useEffect (no Redux)
- **DB Access**: Singleton pattern para SQLite
- **Streaming**: Server-Sent Events para progreso de envío
- **Python Integration**: Child process spawn desde Node

---

## 3. Modelo de Datos (SQLite)

### Diagrama de Relaciones

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    edificios    │       │    unidades     │       │   envios_log    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ edificio_id (FK)│       │ id (PK)         │
│ nombre          │       │ id (PK)         │       │ edificio_id (FK)│──────►│
│ direccion       │       │ n               │       │ tipo_accion     │
│ email_remitente │       │ nombre          │       │ fecha           │
│ nombre_remitente│       │ email_propietario│      │ total_enviados  │
│ ruta_base       │       │ email_inquilino │       │ total_errores   │
│ created_at      │       │ depto           │       │ modo_test       │
│ updated_at      │       │ tipo            │       └─────────────────┘
└─────────────────┘       └─────────────────┘
```

### Tabla: `edificios`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT PK | Slug único + timestamp |
| `nombre` | TEXT NOT NULL | "Consorcio Constitución 2226" |
| `direccion` | TEXT | Dirección física |
| `email_remitente` | TEXT | Email Gmail para envíos |
| `nombre_remitente` | TEXT NOT NULL | Nombre que aparece en "From" |
| `ruta_base` | TEXT NOT NULL | Carpeta del edificio |
| `created_at` | DATETIME | Fecha creación |
| `updated_at` | DATETIME | Última modificación |

### Tabla: `unidades`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT PK | UUID compuesto |
| `edificio_id` | TEXT FK | Referencia a edificios |
| `n` | INTEGER NOT NULL | Número de unidad funcional |
| `nombre` | TEXT | Nombre propietario |
| `email_propietario` | TEXT | Email principal |
| `email_inquilino` | TEXT | Email CC (opcional) |
| `depto` | TEXT | "1A", "PB", "Cochera 5" |
| `tipo` | TEXT | "DEPTO", "COCHERA", etc |

**Constraint**: `UNIQUE(edificio_id, n)`

### Tabla: `envios_log`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT PK | "log-{timestamp}" |
| `edificio_id` | TEXT FK | Referencia a edificios |
| `tipo_accion` | TEXT NOT NULL | expensas/corte_luz/avisos_generales |
| `fecha` | DATETIME | Timestamp del envío |
| `total_enviados` | INTEGER | Cantidad OK |
| `total_errores` | INTEGER | Cantidad fallidos |
| `modo_test` | INTEGER | 0=producción, 1=test |

---

## 4. Funcionalidades Implementadas

### Módulos Principales

#### 4.1 ABM de Edificios
- **Crear**: Modal con validación de campos obligatorios
- **Editar**: Nombre, dirección, nombre remitente (email read-only)
- **Eliminar**: Solo si no tiene unidades asociadas
- **Selector**: Dropdown en header cuando hay múltiples edificios

#### 4.2 Tipos de Envío
| Tipo | Descripción | Adjuntos |
|------|-------------|----------|
| **Expensas** | Liquidación mensual | 2 PDFs por unidad |
| **Corte de Luz** | Aviso a morosos | Sin adjuntos |
| **Avisos Generales** | Comunicados libres | Opcionales |

#### 4.3 Flujo de Envío
1. Seleccionar tipo de envío
2. Cargar Excel con destinatarios
3. (Expensas) Cargar PDFs / (Otros) Seleccionar destinatarios
4. Revisar template del email
5. Activar modo test (opcional) con selector de cantidad (1, 5, o todos)
6. Confirmar y enviar
7. Ver progreso en tiempo real (con opción de cancelar)
8. Resultado guardado en historial

#### 4.6 Modo Test con Límite de Emails
- **Selector de cantidad**: 1, 5, o todos los emails
- **Protección anti-ban**: Evita enviar muchos emails de prueba a Gmail
- **Progress correcto**: Muestra x/1 o x/5 según selección
- **Cancelación**: Botón para abortar envío en progreso

#### 4.4 Editor de Templates
- Edición de HTML con preview en vivo
- Templates separados: cuerpo + firma
- Variables dinámicas: `{mes_expensas}`, `{fecha_corte}`, `{nombre}`, `{depto}`

#### 4.5 Historial de Envíos
- Lista por edificio
- Filtro por tipo de acción
- Indicador modo test
- Contadores enviados/errores

### Flujo de Negocio: Expensas Mensuales

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Excel con   │────►│  Validar     │────►│  Enviar con  │
│  datos       │     │  PDFs        │     │  Gmail API   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                            ▼                     ▼
                     PDFs esperados:        Por cada unidad:
                     - Expensas N.pdf       - Email propietario (To)
                     - Detalle expensas N   - Email inquilino (CC)
                                            - 2 PDFs adjuntos
```

---

## 5. Autenticación y Autorización

### Modelo: Sin Autenticación de Usuarios

Este sistema es una **aplicación de escritorio local** (desktop app). No hay:
- Login/registro de usuarios
- Roles ni permisos
- Multi-tenancy por usuarios

### Gmail OAuth2

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ credentials.json│────►│ Primera vez:    │────►│ token.pickle    │
│ (Google Cloud)  │     │ Flujo OAuth     │     │ (refresh auto)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Flujo**:
1. Usuario configura proyecto en Google Cloud Console
2. Descarga `credentials.json` (OAuth 2.0 Client ID)
3. Primera ejecución abre browser para autorizar
4. Se genera `token.pickle` (se refresca automáticamente)

**Scope**: `https://www.googleapis.com/auth/gmail.send`

### Multi-Edificio

- **Una cuenta Gmail** compartida por todos los edificios
- **Nombre del remitente** cambia según edificio seleccionado
- Ejemplo: mismo `consorcio@gmail.com`, pero "From" muestra "Consorcio A" o "Consorcio B"

---

## 6. APIs

### Endpoints REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/buildings` | Listar edificios |
| POST | `/api/buildings` | Crear edificio |
| GET | `/api/buildings/[id]` | Obtener edificio por ID |
| PUT | `/api/buildings/[id]` | Actualizar edificio |
| DELETE | `/api/buildings/[id]` | Eliminar edificio |
| POST | `/api/enviar` | Enviar emails (SSE stream) |
| GET | `/api/envios-log?edificioId=X` | Historial de envíos |
| POST | `/api/envios-log` | Crear log de envío |
| POST | `/api/excel` | Parsear archivo Excel |
| GET | `/api/templates?file=X` | Leer template HTML |
| POST | `/api/templates` | Guardar template HTML |
| GET | `/api/unidades?edificioId=X` | Listar unidades |
| POST | `/api/unidades` | Upsert unidades |
| POST | `/api/validate-pdfs` | Validar PDFs existentes |

### Detalle: POST /api/enviar

**Request** (FormData):
```
action: "expensas" | "corte_luz" | "avisos_generales"
testMode: "true" | "false"
testEmail: "email@test.com"
testEmailCount: "0" | "1" | "5"  # 0=todos, 1=solo 1, 5=solo 5
pdfFolder: "C:/path/to/pdfs"
diasCorte: "5"
subject: "Asunto personalizado" (solo avisos_generales)
dataFile: File (Excel)
buildingId: "edificio-id-123"
```

**Response** (Server-Sent Events):
```javascript
// Progreso
data: {"type":"progress","line":"  ✓ 1A (email@example.com)"}

// Completado
data: {"type":"complete","success":true,"sent":45,"errors":2,"salteados":3,"message":"..."}
```

---

## 7. Dependencias

### package.json

```json
{
  "dependencies": {
    "better-sqlite3": "^12.5.0",    // DB SQLite sincrónica
    "clsx": "^2.1.1",               // Concatenar clases CSS
    "lucide-react": "^0.548.0",     // Iconos
    "next": "16.0.0",               // Framework
    "react": "19.2.0",              // UI
    "react-dom": "19.2.0",          // React DOM
    "tailwind-merge": "^3.3.1",     // Merge Tailwind classes
    "xlsx": "^0.18.5"               // Parseo Excel
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.0.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### Python (requirements implícitos)
```
pandas
google-auth-oauthlib
google-api-python-client
openpyxl (para Excel .xlsx)
```

---

## 8. Configuración

### Variables de Entorno

Este proyecto **no usa variables de entorno**. La configuración es por archivos locales.

### Archivos de Configuración

| Archivo | Propósito | Gitignored |
|---------|-----------|------------|
| `credentials.json` | OAuth Client ID de Google | ✅ |
| `token.pickle` | Token de acceso Gmail | ✅ |
| `data/consorcio.db` | Base de datos SQLite | ✅ |

### Configuración Python (python/expensas.py)

```python
class Config:
    SCOPES = ['https://www.googleapis.com/auth/gmail.send']

    # Rutas (se sobreescriben dinámicamente)
    BASE_DIR = "C:/Expensas"
    PDFS_DIR = BASE_DIR
    LOGS_DIR = f"{BASE_DIR}/Logs"
    PLANTILLAS_DIR = f"{BASE_DIR}/Plantillas"

    # Modo test
    MODO_TEST = True
    EMAIL_TEST = "tu@email.com"
    TEST_EMAIL_COUNT = 0  # 0=todos, >0=limitar cantidad

    # Remitente (se carga desde edificio)
    NOMBRE_REMITENTE = "Consorcio XYZ"
    EMAIL_REMITENTE = "consorcio@gmail.com"
```

### CLI Arguments (python/expensas.py)

```bash
python expensas.py \
  --action expensas \
  --test-mode true \
  --test-email tu@email.com \
  --test-email-count 5 \        # 0=todos, 1=solo 1, 5=solo 5
  --data-file /path/to/excel.xlsx \
  --pdf-folder /path/to/pdfs \
  --plantillas-dir /path/to/templates \
  --building-config '{"nombre_remitente":"..."}' \
  --no-confirm
```

---

## 9. Features de Negocio

### Sistema de Planes/Pricing

**No aplica**. Es una aplicación de escritorio gratuita/interna.

### Límites

| Límite | Valor |
|--------|-------|
| Edificios | Ilimitados |
| Unidades por edificio | Ilimitadas |
| Emails por envío | Sin límite técnico (límite de Gmail ~500/día) |
| Timeout por envío | 5 minutos |

### Trial

**No aplica**.

---

## 10. Patrones y Utilidades Reutilizables

### Helpers (`lib/utils.ts`)

```typescript
// Merge de clases Tailwind
cn(...inputs: ClassValue[]): string

// Calcular progreso del wizard
getProgressPercentage(config): number

// Generar código de configuración
generateConfigCode(config): string  // "EXP-TEST-OCT"

// Meses disponibles
MONTHS: string[]  // ["Enero 2025", ...]
```

### Componentes Reutilizables

| Componente | Props | Uso |
|------------|-------|-----|
| `Toast` | `show`, `message`, `type`, `onClose` | Notificaciones |
| `Badge` | `variant`, `children` | Tags de estado |
| `SendingProgress` | `show`, `sent`, `total`, `errors`, `lines`, `onCancel` | Progress con cancelación |
| `ConfirmationModal` | `show`, `config`, `totalEmails`, `onConfirm`, `onCancel` | Confirmación pre-envío |

### Patrones de DB (`lib/db.ts`)

```typescript
// Singleton
getDb(): Database

// CRUD Edificios
getAllEdificios(): Edificio[]
getEdificioById(id): Edificio | undefined
createEdificio(data): Edificio
updateEdificio(id, data): Edificio | undefined
deleteEdificio(id): boolean

// CRUD Unidades
getUnidadesByEdificio(edificioId): Unidad[]
upsertUnidades(edificioId, unidades): void
getUnidadesCount(edificioId): number

// Logs
createEnvioLog(log): EnvioLog
getEnviosLogByEdificio(edificioId, limit): EnvioLog[]
```

---

## 11. Flujo de Datos

### Envío de Expensas (Diagrama)

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Frontend│───►│ API     │───►│ Python  │───►│ Gmail   │───►│ Destina-│
│ React   │    │ Node.js │    │ Script  │    │ API     │    │ tarios  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     │   FormData   │   spawn()    │   OAuth2     │
     │   (Excel,    │   args CLI   │   send()     │
     │   config)    │              │              │
     │              │              │              │
     ▼              ▼              ▼              ▼
  useState      Streaming     Línea por      Email con
  progress      SSE events    línea stdout   adjuntos PDF
```

### Secuencia de Envío

1. **Frontend**: Usuario configura y confirma
2. **API**: Recibe FormData, guarda Excel temporal
3. **API**: Spawn proceso Python con argumentos CLI
4. **Python**: Lee Excel, valida PDFs, autentica Gmail
5. **Python**: Por cada unidad, crea y envía email
6. **Python**: Imprime progreso a stdout (flush)
7. **API**: Lee stdout línea por línea, emite SSE
8. **Frontend**: Recibe SSE, actualiza UI en tiempo real
9. **API**: Al terminar, parsea resumen, guarda log en DB
10. **Frontend**: Muestra resultado final

---

## 12. Consideraciones de Seguridad

### Credenciales
- `credentials.json` y `token.pickle` deben estar gitignored
- La DB local contiene emails (datos personales)
- No exponer la app a internet (es para uso local)

### Validaciones
- Validación de email con regex en frontend y backend
- Campos requeridos marcados con asterisco
- No se permite eliminar edificios con unidades

### Límites Gmail
- Límite diario: ~500 emails (cuenta personal) o ~2000 (Google Workspace)
- Rate limiting: no implementado (depende de Gmail)

---

## 13. Desarrollo Local

### Requisitos
- Node.js 18+
- Python 3.8+
- npm o yarn

### Setup

```bash
# 1. Clonar repo
git clone https://github.com/mxrcabrera/consorcio-expensas-frontend.git
cd consorcio-expensas-frontend

# 2. Instalar dependencias Node
npm install

# 3. Instalar dependencias Python
pip install pandas google-auth-oauthlib google-api-python-client openpyxl

# 4. Configurar OAuth (una sola vez)
# - Crear proyecto en Google Cloud Console
# - Habilitar Gmail API
# - Crear OAuth Client ID (Desktop app)
# - Descargar como credentials.json en raíz del proyecto

# 5. Ejecutar en desarrollo
npm run dev

# 6. Abrir http://localhost:3000
```

### Build de Producción

```bash
npm run build
npm start
```

---

## 14. Roadmap / TODOs

- [ ] Instalador Windows (Electron + electron-builder)
- [ ] Firma digital de emails (DKIM)
- [ ] Reportes exportables (PDF)
- [ ] Backup automático de DB
- [ ] Soporte multi-idioma

---

## 15. Changelog Reciente

### v1.1.0 (Enero 2026)
- **Selector de cantidad en modo test**: Botones para elegir 1, 5, o todos los emails
- **Botón cancelar**: Permite abortar envíos en progreso
- **Progress bar dinámico**: Muestra x/1 o x/5 según cantidad seleccionada
- **AbortController**: Frontend puede cancelar fetch y notificar al usuario
- **Limpieza de componentes**: Eliminados componentes no utilizados

---

*Documento actualizado: Enero 2026*
*Versión: 1.1*
