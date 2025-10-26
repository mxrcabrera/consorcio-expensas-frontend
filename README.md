# 🏢 Consorcio Expensas - Sistema de Notificaciones

Sistema automatizado para envío de expensas, avisos de corte de luz y comunicados generales para administración de consorcios.

## 🚀 Features

- ✅ Envío masivo de expensas con PDFs adjuntos
- ✅ Avisos de corte de luz programados
- ✅ Comunicados generales del consorcio
- ✅ Modo test para pruebas
- ✅ Validación de PDFs en tiempo real
- ✅ Editor de templates HTML
- ✅ Viewer de datos Excel
- ✅ Progreso en tiempo real con SSE

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes + Python
- **Email:** Gmail API
- **Archivos:** openpyxl (Excel), PDFs

## 📦 Instalación

### Requisitos
- Node.js 18+
- Python 3.8+
- Cuenta de Gmail con API habilitada

### Setup

1. **Clonar el repo:**
```bash
git clone https://github.com/mxrcabrera/consorcio-expensas-frontend.git
cd consorcio-expensas-frontend
```

2. **Instalar dependencias Node:**
```bash
npm install
```

3. **Instalar dependencias Python:**
```bash
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client openpyxl
```

4. **Configurar Gmail API:**
- Ir a [Google Cloud Console](https://console.cloud.google.com/)
- Crear proyecto y habilitar Gmail API
- Descargar `credentials.json` y ponerlo en la raíz del proyecto

5. **Iniciar desarrollo:**
```bash
npm run dev
```

## 📁 Estructura del Proyecto
```
consorcio-expensas-frontend/
├── app/
│   ├── api/
│   │   ├── enviar/         # API de envío con streaming
│   │   ├── excel/          # Parser de Excel
│   │   ├── templates/      # Gestión de templates
│   │   └── validate-pdfs/  # Validación de PDFs
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # Página principal
├── components/
│   ├── ActionSelector.tsx
│   ├── ConfigSummary.tsx
│   ├── ConfirmationModal.tsx
│   ├── CorteLuzConfig.tsx
│   ├── ExcelDataViewer.tsx
│   ├── FileUpload.tsx
│   ├── Header.tsx
│   ├── PDFFolderInput.tsx
│   ├── PDFValidator.tsx
│   ├── ProgressBar.tsx
│   ├── SendButton.tsx
│   ├── SendingProgress.tsx
│   ├── SubjectInput.tsx
│   ├── TemplateEditor.tsx
│   ├── TemplatePreview.tsx
│   └── TestModeToggle.tsx
├── lib/
│   └── utils.ts            # Utilidades compartidas
├── python/
│   ├── expensas.py         # Sistema de envío Python
│   └── wrapper.py          # CLI wrapper
├── templates/              # Templates HTML de emails
│   ├── aviso_general.html
│   ├── corte_luz.html
│   ├── expensas.html
│   └── firma.html
├── types/
│   └── index.ts            # Tipos TypeScript
├── temp/                   # Archivos temporales
├── logs/                   # Logs de envíos
└── public/                 # Assets estáticos
```

## 🔧 Configuración

El sistema usa un archivo Excel con las siguientes columnas:
- `N`: Número de unidad funcional
- `Depto`: Nombre del departamento
- `Email`: Email del propietario
- `Email inquilino`: Email del inquilino (opcional)
- `CC`: Si debe enviar copia al inquilino (S/N)

Los PDFs deben seguir el formato:
- `Expensas [N].pdf` (ej: `Expensas A1.pdf`)
- `Detalle expensas [N].pdf` (ej: `Detalle expensas A1.pdf`)

## 📧 Uso

1. **Seleccionar tipo de acción:** Expensas / Corte Luz / Avisos Generales
2. **Configurar modo test** (opcional): Envía todo a un solo email
3. **Subir archivo Excel** con destinatarios
4. **Para expensas:** Especificar carpeta con PDFs
5. **Validar** configuración y PDFs
6. **Confirmar y enviar**

## 🎨 Funcionalidades

- **Editor de Templates:** Modificar HTML de emails en tiempo real
- **Validador de PDFs:** Verifica que existan todos los archivos necesarios
- **Viewer de Excel:** Previsualizar datos antes de enviar
- **Progreso en tiempo real:** Ver envíos en vivo con Server-Sent Events
- **Modo Test:** Probar sin enviar a destinatarios reales

## 🔐 Seguridad

- ✅ Credenciales de Gmail nunca se suben al repo (`.gitignore`)
- ✅ Modo test para validar antes de enviar
- ✅ Confirmación obligatoria antes de envíos masivos
- ✅ Validación de archivos y emails

## 👨‍💻 Desarrollo

**MxrCabrera Dev** - 2025

## 📄 Licencia

MIT