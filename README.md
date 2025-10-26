# 🏢 Consorcio Expensas - Sistema de Notificaciones

Sistema automatizado para envío de expensas, avisos de corte de luz y comunicados generales para administración de consorcios.

## 🚀 Features

- ✅ Envío masivo de expensas con PDFs adjuntos
- ✅ Avisos de corte de luz programados
- ✅ Comunicados generales del consorcio
- ✅ Modo test para pruebas
- ✅ Validación de PDFs
- ✅ Editor de templates
- ✅ Progreso en tiempo real

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes + Python
- **Email:** Gmail API
- **Archivos:** xlsx, PDFs

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

2. **Instalar dependencias:**
```bash
npm install
pip install -r requirements.txt
```

3. **Configurar Gmail API:**
- Ir a [Google Cloud Console](https://console.cloud.google.com/)
- Crear proyecto y habilitar Gmail API
- Descargar `credentials.json` y ponerlo en la raíz

4. **Iniciar desarrollo:**
```bash
npm run dev
```

## 📁 Estructura del Proyecto
```
consorcio-expensas-frontend/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   └── page.tsx           # Página principal
├── components/            # React components
├── python/                # Scripts Python
│   ├── expensas.py       # Sistema de envío
│   └── wrapper.py        # CLI wrapper
├── templates/             # Templates de emails
└── public/               # Assets estáticos
```

## 🔧 Configuración

El sistema usa un archivo Excel (`datos_maestro.xlsx`) con las siguientes columnas:
- `N`: Número de unidad funcional
- `Depto`: Nombre del departamento
- `Email`: Email del propietario
- `Email inquilino`: Email del inquilino (opcional)
- `CC`: Si debe enviar copia al inquilino (S/N)

## 📧 Uso

1. Seleccionar tipo de acción (Expensas / Corte Luz / Avisos)
2. Configurar modo test (opcional)
3. Subir archivo Excel con destinatarios
4. Para expensas: especificar carpeta con PDFs
5. Revisar configuración y enviar

## 🔐 Seguridad

- Credenciales de Gmail nunca se suben al repo
- Modo test para validar antes de enviar
- Confirmación antes de envíos masivos

## 👨‍💻 Desarrollo

**MxrCabrera Dev** - 2025

## 📄 Licencia

MIT