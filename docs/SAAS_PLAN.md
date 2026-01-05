# Plan de Transformación a SaaS - Consorcio Expensas

## Resumen Ejecutivo

Transformar la aplicación local de gestión de expensas en un SaaS multi-tenant para administradores de consorcios en Argentina.

**Beta tester**: Consorcio Constitución 2226 (33 UF: 28 deptos + 5 cocheras)

---

## Changelog de Correcciones ⚠️

| Sección | Cambio |
|---------|--------|
| **1.3 conceptos** | ABM configurable por consorcio. Sin rubros hardcodeados (EDESUR, AYSA, etc). |
| **1.3 usuarios** | Distinción `super_admin` (dueños SaaS) vs `admin` (clientes). Nueva tabla `admin_consorcios`. |
| **1.4 RLS** | Políticas actualizadas con soporte para super_admin. |
| **2.4 Carga de gastos** | Flujo principal: carga manual. Excel como import opcional con mapeo de columnas. |
| **3.1 Core Features** | Eliminado "Avisos de corte de luz" (uso interno). Solo 2 tipos: Expensas, Avisos generales. |
| **5.1 Qué Reutilizar** | Detalle de componentes del sistema actual a migrar (referencia a SYSTEM_OVERVIEW.md). |
| **5.2 Migración** | Conceptos NO se crean por defecto. Onboarding guía al admin a crearlos. |
| **7.1 Roadmap** | Eliminadas referencias a "part-time" y fechas específicas. Solo fases y milestones. |

*Última actualización: Enero 2026 - v1.1*

---

## Índice

1. [Modelo de Datos](#1-modelo-de-datos)
2. [Arquitectura Técnica](#2-arquitectura-técnica)
3. [Funcionalidades por Fase](#3-funcionalidades-por-fase)
4. [Costos de Infraestructura](#4-costos-de-infraestructura)
5. [Plan de Migración](#5-plan-de-migración)
6. [Análisis de Riesgos](#6-análisis-de-riesgos)
7. [Roadmap](#7-roadmap)

---

## 1. Modelo de Datos

### 1.1 Estrategia Multi-Tenancy

**Enfoque elegido: Row-Level Security (RLS) con tenant_id**

| Estrategia | Pros | Contras | Veredicto |
|------------|------|---------|-----------|
| DB por tenant | Aislamiento total | Costoso, difícil mantener | ❌ |
| Schema por tenant | Buen aislamiento | Complejo en Supabase | ❌ |
| **RLS con tenant_id** | Simple, económico, nativo Supabase | Requiere cuidado en queries | ✅ |

Cada tabla tendrá `consorcio_id` como discriminador. Supabase RLS garantiza que cada usuario solo vea datos de su consorcio.

### 1.2 Diagrama Entidad-Relación

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CORE ENTITIES                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   organizations  │       │    consorcios    │       │     usuarios     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │◄──────│ organization_id  │       │ id (PK)          │
│ name             │       │ id (PK)          │◄──────│ consorcio_id (FK)│
│ plan             │       │ nombre           │       │ auth_id (Supabase│
│ billing_email    │       │ direccion        │       │ email            │
│ stripe_customer  │       │ cuit             │       │ nombre           │
│ created_at       │       │ logo_url         │       │ rol              │
└──────────────────┘       │ config_json      │       │ unidad_id (FK)?  │
        │                  │ created_at       │       │ activo           │
        │                  └──────────────────┘       │ created_at       │
        │                          │                  └──────────────────┘
        │                          │                          │
        ▼                          ▼                          │
┌──────────────────┐       ┌──────────────────┐              │
│  subscriptions   │       │     unidades     │◄─────────────┘
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ organization_id  │       │ consorcio_id (FK)│
│ plan             │       │ numero_uf        │
│ status           │       │ piso_depto       │
│ current_period   │       │ tipo             │
│ mp_subscription  │       │ metros_cuadrados │
│ created_at       │       │ coef_fiscal      │
│ canceled_at      │       │ propietario_id   │
└──────────────────┘       │ inquilino_id     │
                           │ created_at       │
                           └──────────────────┘
                                   │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LIQUIDACIÓN DE EXPENSAS                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    periodos      │       │  liquidaciones   │       │  conceptos       │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │◄──────│ periodo_id (FK)  │       │ id (PK)          │
│ consorcio_id (FK)│       │ id (PK)          │       │ consorcio_id (FK)│
│ mes              │       │ unidad_id (FK)   │       │ nombre           │
│ anio             │       │ total_expensas_a │       │ tipo_prorrateo   │
│ fecha_cierre     │       │ total_expensas_b │       │ categoria        │
│ fecha_vto_1      │       │ total_extraordin │       │ orden            │
│ fecha_vto_2      │       │ saldo_anterior   │       │ activo           │
│ recargo_vto_1    │       │ pagos_periodo    │       └──────────────────┘
│ recargo_vto_2    │       │ ajustes          │               │
│ estado           │       │ total_a_pagar    │               │
│ cerrado          │       │ estado_pago      │               │
│ pdf_generado     │       │ pdf_url          │               │
└──────────────────┘       │ created_at       │               ▼
        │                  └──────────────────┘       ┌──────────────────┐
        │                          │                  │ gastos_periodo   │
        │                          │                  ├──────────────────┤
        ▼                          ▼                  │ id (PK)          │
┌──────────────────┐       ┌──────────────────┐       │ periodo_id (FK)  │
│ movimientos_caja │       │ items_liquidacion│       │ concepto_id (FK) │
├──────────────────┤       ├──────────────────┤       │ proveedor        │
│ id (PK)          │       │ id (PK)          │       │ descripcion      │
│ periodo_id (FK)  │       │ liquidacion_id   │       │ monto            │
│ fecha            │       │ concepto_id (FK) │       │ comprobante_url  │
│ tipo             │       │ descripcion      │       │ fecha            │
│ concepto         │       │ monto            │       └──────────────────┘
│ monto            │       │ tipo_prorrateo   │
│ comprobante_url  │       └──────────────────┘
│ unidad_id (FK)?  │
│ created_at       │
└──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PAGOS Y COBRANZAS                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     pagos        │       │   deudas         │       │ envios_email     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ liquidacion_id   │       │ unidad_id (FK)   │       │ consorcio_id (FK)│
│ unidad_id (FK)   │       │ periodo_id (FK)  │       │ tipo (*)         │
│ fecha            │       │ monto_original   │       │ periodo_id (FK)  │
│ monto            │       │ monto_pendiente  │       │ destinatarios    │
│ medio_pago       │       │ fecha_vto        │       │ asunto           │
│ referencia       │       │ dias_mora        │       │ enviados_ok      │
│ comprobante_url  │       │ estado           │       │ enviados_error   │
│ informado_por    │       │ created_at       │       │ fecha            │
│ verificado       │       └──────────────────┘       └──────────────────┘
│ created_at       │
└──────────────────┘
(*) tipo: 'expensas' | 'aviso_general' ⚠️ Solo 2 tipos públicos

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FASE 2: PORTAL VECINOS                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    reclamos      │       │    reservas      │       │    amenities     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ consorcio_id (FK)│       │ amenity_id (FK)  │       │ consorcio_id (FK)│
│ unidad_id (FK)   │       │ unidad_id (FK)   │       │ nombre           │
│ usuario_id (FK)  │       │ fecha            │       │ descripcion      │
│ categoria        │       │ hora_inicio      │       │ capacidad        │
│ titulo           │       │ hora_fin         │       │ requiere_deposito│
│ descripcion      │       │ estado           │       │ monto_deposito   │
│ estado           │       │ created_at       │       │ reglas           │
│ prioridad        │       └──────────────────┘       │ activo           │
│ respuesta        │                                  └──────────────────┘
│ created_at       │
│ closed_at        │
└──────────────────┘
```

### 1.3 Detalle de Entidades Clave

#### conceptos (ABM configurable por consorcio) ⚠️ ACTUALIZADO
```sql
-- Cada consorcio define sus propios conceptos de gasto
-- NO hay conceptos hardcodeados (EDESUR, AYSA, etc son ejemplos, no defaults)
CREATE TABLE conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consorcio_id UUID REFERENCES consorcios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,                    -- "Sueldo encargado", "ABL", "Luz partes comunes"
  tipo_prorrateo TEXT NOT NULL DEFAULT 'por_coef',  -- 'por_uf', 'por_coef', 'fijo', 'metros'
  categoria TEXT NOT NULL DEFAULT 'A',     -- 'A' (ordinarias), 'B' (ordinarias), 'extraordinaria'
  orden INT DEFAULT 0,                     -- Para ordenar en la liquidación
  activo BOOLEAN DEFAULT TRUE,             -- Soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(consorcio_id, nombre)
);

-- El admin del consorcio crea/edita/elimina sus conceptos desde:
-- /configuracion/conceptos/page.tsx (ABM completo)
```

#### organizations (Facturación)
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free', -- free, basic, pro, enterprise
  max_unidades INT NOT NULL DEFAULT 15,
  billing_email TEXT,
  mp_customer_id TEXT, -- MercadoPago
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### consorcios (Tenant)
```sql
CREATE TABLE consorcios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  localidad TEXT,
  provincia TEXT DEFAULT 'CABA',
  cuit TEXT,
  fecha_cierre_mes INT DEFAULT 25, -- día del mes
  logo_url TEXT,
  config JSONB DEFAULT '{}', -- configuraciones varias
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### usuarios (Multi-rol) ⚠️ ACTUALIZADO
```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id), -- Supabase Auth
  consorcio_id UUID REFERENCES consorcios(id), -- NULL para super_admin
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  telefono TEXT,
  rol TEXT NOT NULL,
  -- Roles:
  --   'super_admin': Dueños del SaaS (nosotros). Ve todos los consorcios, métricas globales, config planes
  --   'admin': Admin de consorcio (cliente). Solo ve su(s) consorcio(s), features según plan
  --   'propietario': Propietario de unidad (Fase 2)
  --   'inquilino': Inquilino de unidad (Fase 2)
  --   'encargado': Encargado del edificio (Fase 2)
  unidad_id UUID REFERENCES unidades(id), -- NULL para admins/super_admin
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla auxiliar para super_admin con acceso a múltiples consorcios
CREATE TABLE admin_consorcios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  consorcio_id UUID REFERENCES consorcios(id) ON DELETE CASCADE,
  permisos JSONB DEFAULT '{"lectura": true, "escritura": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, consorcio_id)
);
```

#### unidades
```sql
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consorcio_id UUID REFERENCES consorcios(id),
  numero_uf INT NOT NULL, -- 1, 2, 3...
  piso_depto TEXT NOT NULL, -- "PB A", "1 B", "Cochera 5"
  tipo TEXT NOT NULL, -- 'DEPARTAMENTO', 'COCHERA', 'LOCAL', 'BAULERA'
  metros_cuadrados DECIMAL(10,2),
  coef_fiscal DECIMAL(10,6), -- % para prorrateo
  propietario_nombre TEXT,
  propietario_email TEXT,
  propietario_telefono TEXT,
  inquilino_nombre TEXT,
  inquilino_email TEXT,
  inquilino_telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(consorcio_id, numero_uf)
);
```

#### periodos (Mes de expensas)
```sql
CREATE TABLE periodos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consorcio_id UUID REFERENCES consorcios(id),
  mes INT NOT NULL, -- 1-12
  anio INT NOT NULL,
  fecha_cierre DATE,
  fecha_vto_1 DATE, -- día 10
  fecha_vto_2 DATE, -- día 20
  recargo_vto_1 DECIMAL(5,2) DEFAULT 10.00, -- 10%
  recargo_vto_2 DECIMAL(5,2) DEFAULT 20.00, -- 20%
  estado TEXT DEFAULT 'borrador', -- borrador, cerrado, enviado
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(consorcio_id, mes, anio)
);
```

#### liquidaciones (Expensa por unidad)
```sql
CREATE TABLE liquidaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id UUID REFERENCES periodos(id),
  unidad_id UUID REFERENCES unidades(id),
  -- Montos
  total_expensas_a DECIMAL(12,2) DEFAULT 0, -- Ordinarias A
  total_expensas_b DECIMAL(12,2) DEFAULT 0, -- Ordinarias B
  total_extraordinarias DECIMAL(12,2) DEFAULT 0,
  saldo_anterior DECIMAL(12,2) DEFAULT 0,
  pagos_periodo DECIMAL(12,2) DEFAULT 0,
  ajustes DECIMAL(12,2) DEFAULT 0,
  total_a_pagar DECIMAL(12,2) GENERATED ALWAYS AS (
    total_expensas_a + total_expensas_b + total_extraordinarias +
    saldo_anterior - pagos_periodo + ajustes
  ) STORED,
  -- Estado
  estado_pago TEXT DEFAULT 'pendiente', -- pendiente, parcial, pagado
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periodo_id, unidad_id)
);
```

### 1.4 Row-Level Security (RLS) ⚠️ ACTUALIZADO

```sql
-- ============================================
-- RLS con soporte para super_admin + admin
-- ============================================

ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;

-- Helper function para verificar rol
CREATE OR REPLACE FUNCTION user_is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_id = auth.uid() AND rol = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function para obtener consorcios del usuario
CREATE OR REPLACE FUNCTION user_consorcio_ids()
RETURNS SETOF UUID AS $$
  -- Si es super_admin, puede ver todos los consorcios que tenga en admin_consorcios
  -- Si es admin, solo ve su consorcio_id
  SELECT CASE
    WHEN user_is_super_admin() THEN
      (SELECT consorcio_id FROM admin_consorcios WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_id = auth.uid()))
    ELSE
      (SELECT consorcio_id FROM usuarios WHERE auth_id = auth.uid())
  END;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Policy: Lectura - usuarios ven su(s) consorcio(s), super_admin ve según admin_consorcios
CREATE POLICY "Usuarios ven su consorcio" ON unidades
  FOR SELECT
  USING (
    user_is_super_admin() -- super_admin ve todo (o filtrar por admin_consorcios)
    OR consorcio_id IN (SELECT consorcio_id FROM usuarios WHERE auth_id = auth.uid())
  );

-- Policy: Escritura - solo admins de ese consorcio o super_admin
CREATE POLICY "Admins modifican" ON unidades
  FOR ALL
  USING (
    user_is_super_admin()
    OR consorcio_id IN (
      SELECT consorcio_id FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'admin'
    )
  );

-- Aplicar patrón similar a todas las tablas con consorcio_id
```

---

## 2. Arquitectura Técnica

### 2.1 Stack Definitivo

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Frontend** | Next.js 15 (App Router) | SSR, RSC, ya lo conocés |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Rápido, consistente |
| **Auth** | Supabase Auth | Integrado, OAuth, magic links |
| **Database** | Supabase PostgreSQL | RLS nativo, realtime |
| **ORM** | Prisma | Type-safe, migraciones |
| **Storage** | Supabase Storage | PDFs, comprobantes |
| **PDFs** | @react-pdf/renderer | Serverless-friendly |
| **Emails** | Resend | Simple, buena deliverability |
| **Pagos** | MercadoPago | Estándar en Argentina |
| **Hosting** | Netlify | Restricción del proyecto |
| **Monitoreo** | Sentry (free tier) | Errores en producción |

### 2.2 Estructura del Proyecto

```
consorcio-saas/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (dashboard)/              # Layout con sidebar
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard home
│   │   │
│   │   ├── unidades/
│   │   │   ├── page.tsx          # Lista
│   │   │   ├── [id]/page.tsx     # Detalle
│   │   │   └── nueva/page.tsx    # Crear
│   │   │
│   │   ├── expensas/
│   │   │   ├── page.tsx          # Períodos
│   │   │   ├── [periodoId]/
│   │   │   │   ├── page.tsx      # Liquidación del mes
│   │   │   │   ├── gastos/page.tsx
│   │   │   │   └── preview/page.tsx
│   │   │   └── nueva/page.tsx
│   │   │
│   │   ├── pagos/
│   │   │   ├── page.tsx          # Cobranzas
│   │   │   ├── registrar/page.tsx
│   │   │   └── deudores/page.tsx
│   │   │
│   │   ├── comunicaciones/
│   │   │   ├── page.tsx          # Historial
│   │   │   └── enviar/page.tsx
│   │   │
│   │   ├── configuracion/
│   │   │   ├── consorcio/page.tsx
│   │   │   ├── conceptos/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   └── usuarios/page.tsx
│   │   │
│   │   └── cuenta/
│   │       ├── perfil/page.tsx
│   │       ├── plan/page.tsx
│   │       └── facturacion/page.tsx
│   │
│   ├── (portal)/                 # FASE 2: Portal vecinos
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── expensas/page.tsx
│   │   ├── pagos/page.tsx
│   │   ├── reclamos/page.tsx
│   │   └── reservas/page.tsx
│   │
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── mercadopago/route.ts
│   │   │   └── resend/route.ts
│   │   ├── pdf/
│   │   │   └── [liquidacionId]/route.ts
│   │   └── cron/
│   │       └── recordatorios/route.ts
│   │
│   └── layout.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui
│   ├── forms/
│   ├── tables/
│   ├── modals/
│   └── pdf/                      # Templates PDF
│       ├── LiquidacionPDF.tsx
│       ├── DetallePDF.tsx
│       └── styles.ts
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── prisma/
│   │   └── client.ts
│   ├── resend/
│   │   └── client.ts
│   ├── mercadopago/
│   │   └── client.ts
│   ├── pdf/
│   │   └── generator.ts
│   └── utils/
│       ├── currency.ts
│       ├── dates.ts
│       └── prorrateo.ts          # Lógica de cálculo
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── emails/                       # Templates React Email
│   ├── LiquidacionEmail.tsx
│   ├── RecordatorioEmail.tsx
│   └── AvisoEmail.tsx
│
└── types/
    └── index.ts
```

### 2.3 Generación de PDFs en Serverless

**Problema**: Netlify Functions tienen 10s timeout (26s en Pro). Puppeteer no es viable.

**Solución**: `@react-pdf/renderer`

```tsx
// components/pdf/LiquidacionPDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 16, fontWeight: 'bold' },
  table: { display: 'flex', flexDirection: 'column', marginTop: 10 },
  row: { flexDirection: 'row', borderBottom: '1px solid #ccc', padding: 5 },
  // ... más estilos
});

interface Props {
  consorcio: Consorcio;
  unidad: Unidad;
  liquidacion: Liquidacion;
  items: ItemLiquidacion[];
}

export function LiquidacionPDF({ consorcio, unidad, liquidacion, items }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header con logo */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{consorcio.nombre}</Text>
            <Text>{consorcio.direccion}</Text>
          </View>
          <View>
            <Text>Expensas {liquidacion.periodo}</Text>
            <Text>UF {unidad.numero_uf} - {unidad.piso_depto}</Text>
          </View>
        </View>

        {/* Tabla de conceptos */}
        <View style={styles.table}>
          <View style={[styles.row, { backgroundColor: '#f0f0f0' }]}>
            <Text style={{ flex: 3 }}>Concepto</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>Importe</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.row}>
              <Text style={{ flex: 3 }}>{item.descripcion}</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>
                ${item.monto.toLocaleString('es-AR')}
              </Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={[styles.row, { backgroundColor: '#1f4e78', color: 'white' }]}>
          <Text style={{ flex: 3, fontWeight: 'bold' }}>TOTAL A PAGAR</Text>
          <Text style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>
            ${liquidacion.total_a_pagar.toLocaleString('es-AR')}
          </Text>
        </View>

        {/* Datos de pago */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: 'bold' }}>Datos para el pago:</Text>
          <Text>CBU: {consorcio.config.cbu}</Text>
          <Text>Alias: {consorcio.config.alias}</Text>
          <Text>Vto 1: {liquidacion.fecha_vto_1} (10% recargo después)</Text>
          <Text>Vto 2: {liquidacion.fecha_vto_2} (20% recargo después)</Text>
        </View>
      </Page>
    </Document>
  );
}
```

```typescript
// app/api/pdf/[liquidacionId]/route.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { LiquidacionPDF } from '@/components/pdf/LiquidacionPDF';

export async function GET(
  request: Request,
  { params }: { params: { liquidacionId: string } }
) {
  // 1. Obtener datos
  const liquidacion = await prisma.liquidacion.findUnique({
    where: { id: params.liquidacionId },
    include: {
      unidad: true,
      periodo: { include: { consorcio: true } },
      items: { include: { concepto: true } }
    }
  });

  // 2. Generar PDF (< 2 segundos típicamente)
  const pdfBuffer = await renderToBuffer(
    <LiquidacionPDF
      consorcio={liquidacion.periodo.consorcio}
      unidad={liquidacion.unidad}
      liquidacion={liquidacion}
      items={liquidacion.items}
    />
  );

  // 3. Subir a Supabase Storage
  const { data, error } = await supabase.storage
    .from('liquidaciones')
    .upload(
      `${liquidacion.periodo.consorcio.id}/${params.liquidacionId}.pdf`,
      pdfBuffer,
      { contentType: 'application/pdf', upsert: true }
    );

  // 4. Actualizar URL en DB
  await prisma.liquidacion.update({
    where: { id: params.liquidacionId },
    data: { pdf_url: data.path }
  });

  // 5. Retornar PDF
  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="expensas-${params.liquidacionId}.pdf"`
    }
  });
}
```

### 2.4 Carga de Gastos ⚠️ ACTUALIZADO

**Flujo principal: Carga manual en la app**
El admin carga gastos uno a uno en un formulario. Esto es más simple y no requiere Excel.

**Flujo alternativo: Importar desde Excel (feature opcional)**
Reutiliza la lógica de parseo `xlsx` del sistema actual. Útil para migración inicial o usuarios que prefieren Excel.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FLUJOS DE CARGA DE GASTOS                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   FLUJO PRINCIPAL (Recomendado)          FLUJO ALTERNATIVO          │
│   ─────────────────────────────          ──────────────────         │
│                                                                     │
│   ┌─────────────────────┐                ┌─────────────────────┐    │
│   │ Formulario web      │                │ Importar Excel      │    │
│   │ - Concepto (select) │                │ - Subir archivo     │    │
│   │ - Monto             │                │ - Mapear columnas   │    │
│   │ - Proveedor         │                │ - Preview datos     │    │
│   │ - Comprobante (opt) │                │ - Confirmar import  │    │
│   └─────────────────────┘                └─────────────────────┘    │
│            │                                      │                 │
│            ▼                                      ▼                 │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    gastos_periodo (DB)                       │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Importador de Excel (reutiliza lógica existente)
```typescript
// Reutiliza: xlsx de package.json actual
// Referencia: app/api/excel/route.ts del sistema actual
import * as XLSX from 'xlsx';

interface ExcelImportConfig {
  columna_concepto: string;    // "A" o nombre de header
  columna_monto: string;
  columna_proveedor?: string;
  columna_fecha?: string;
  fila_inicio: number;         // Saltar headers
}

async function importarGastosDesdeExcel(
  file: File,
  config: ExcelImportConfig,
  periodoId: string,
  consorcioId: string
) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });

  // Mapear a gastos_periodo según config de columnas
  const gastos = data.slice(config.fila_inicio - 1).map(row => ({
    periodo_id: periodoId,
    concepto_id: matchConcepto(row[config.columna_concepto], consorcioId),
    monto: parseFloat(row[config.columna_monto]),
    proveedor: row[config.columna_proveedor] || null,
    fecha: row[config.columna_fecha] || new Date(),
  }));

  return prisma.gastoPeriodo.createMany({ data: gastos });
}
```

#### Lógica de prorrateo (se mantiene igual)
```typescript
// lib/utils/prorrateo.ts

interface GastoPeriodo {
  concepto_id: string;
  monto: number;
  tipo_prorrateo: 'por_uf' | 'por_coef' | 'fijo' | 'metros';
}

interface Unidad {
  id: string;
  coef_fiscal: number;
  metros_cuadrados: number;
}

export function calcularProrrateo(
  gasto: GastoPeriodo,
  unidades: Unidad[],
  unidadActual: Unidad
): number {
  const totalUnidades = unidades.length;
  const totalCoef = unidades.reduce((sum, u) => sum + u.coef_fiscal, 0);
  const totalMetros = unidades.reduce((sum, u) => sum + u.metros_cuadrados, 0);

  switch (gasto.tipo_prorrateo) {
    case 'por_uf':
      // División equitativa
      return gasto.monto / totalUnidades;

    case 'por_coef':
      // Por coeficiente fiscal (más común)
      return gasto.monto * (unidadActual.coef_fiscal / totalCoef);

    case 'metros':
      // Por metros cuadrados
      return gasto.monto * (unidadActual.metros_cuadrados / totalMetros);

    case 'fijo':
      // Monto fijo por unidad (ej: expensas extraordinarias específicas)
      return gasto.monto;

    default:
      return gasto.monto / totalUnidades;
  }
}

// Generar liquidación completa
export async function generarLiquidacionPeriodo(periodoId: string) {
  const periodo = await prisma.periodo.findUnique({
    where: { id: periodoId },
    include: {
      consorcio: { include: { unidades: true } },
      gastos: { include: { concepto: true } }
    }
  });

  const unidades = periodo.consorcio.unidades;
  const gastos = periodo.gastos;

  // Para cada unidad, calcular su liquidación
  for (const unidad of unidades) {
    const items: ItemLiquidacion[] = [];
    let totalA = 0, totalB = 0, totalExtra = 0;

    for (const gasto of gastos) {
      const monto = calcularProrrateo(gasto, unidades, unidad);

      items.push({
        concepto_id: gasto.concepto_id,
        descripcion: gasto.concepto.nombre,
        monto,
        tipo_prorrateo: gasto.tipo_prorrateo
      });

      // Clasificar por tipo
      if (gasto.concepto.categoria === 'A') totalA += monto;
      else if (gasto.concepto.categoria === 'B') totalB += monto;
      else totalExtra += monto;
    }

    // Obtener saldo anterior
    const saldoAnterior = await obtenerSaldoAnterior(unidad.id, periodoId);

    // Crear/actualizar liquidación
    await prisma.liquidacion.upsert({
      where: { periodo_id_unidad_id: { periodo_id: periodoId, unidad_id: unidad.id } },
      create: {
        periodo_id: periodoId,
        unidad_id: unidad.id,
        total_expensas_a: totalA,
        total_expensas_b: totalB,
        total_extraordinarias: totalExtra,
        saldo_anterior: saldoAnterior,
        items: { create: items }
      },
      update: {
        total_expensas_a: totalA,
        total_expensas_b: totalB,
        total_extraordinarias: totalExtra,
        saldo_anterior: saldoAnterior,
        items: { deleteMany: {}, create: items }
      }
    });
  }
}
```

### 2.5 Envío de Emails

```typescript
// lib/resend/client.ts
import { Resend } from 'resend';
import { LiquidacionEmail } from '@/emails/LiquidacionEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarLiquidacion(
  liquidacion: Liquidacion,
  pdfUrl: string
) {
  const { unidad, periodo } = liquidacion;
  const emails = [unidad.propietario_email, unidad.inquilino_email].filter(Boolean);

  // Descargar PDF de Supabase
  const pdfBuffer = await supabase.storage
    .from('liquidaciones')
    .download(pdfUrl);

  const { data, error } = await resend.emails.send({
    from: `${periodo.consorcio.nombre} <expensas@tudominio.com>`,
    to: emails,
    subject: `Liquidación de Expensas ${periodo.mes}/${periodo.anio} - ${unidad.piso_depto}`,
    react: LiquidacionEmail({ liquidacion }),
    attachments: [
      {
        filename: `expensas-${periodo.mes}-${periodo.anio}.pdf`,
        content: pdfBuffer
      }
    ]
  });

  return { data, error };
}
```

---

## 3. Funcionalidades por Fase

### 3.1 MVP (Fase 1) - Administradores

**Objetivo**: Reemplazar el sistema actual + multi-tenancy

#### Core Features

| Feature | Prioridad | Plan |
|---------|-----------|------|
| Auth (email/password) | P0 | Todos |
| CRUD Consorcio | P0 | Todos |
| CRUD Unidades | P0 | Todos |
| CRUD Conceptos de gasto | P0 | Todos |
| Crear período mensual | P0 | Todos |
| Cargar gastos del mes | P0 | Todos |
| Calcular liquidaciones | P0 | Todos |
| Generar PDFs | P0 | Todos |
| Enviar por email | P0 | Todos |
| Historial de envíos | P0 | Todos |
| Registrar pagos | P0 | Todos |
| Ver deudores | P0 | Todos |
| Dashboard resumen | P1 | Todos |
| Editar templates email | P1 | Básico+ |
| Múltiples consorcios | P1 | Pro+ |
| Exportar a Excel | P2 | Básico+ |
| Avisos generales (comunicados) | P1 | Todos |

#### Restricciones por Plan

| Feature | Free | Básico | Pro | Enterprise |
|---------|------|--------|-----|------------|
| Unidades funcionales | 15 | 50 | 150 | Ilimitado |
| Consorcios | 1 | 1 | 3 | Ilimitado |
| Usuarios admin | 1 | 2 | 5 | Ilimitado |
| Historial meses | 6 | 12 | 24 | Ilimitado |
| Storage PDFs | 500MB | 2GB | 10GB | Ilimitado |
| Soporte | Comunidad | Email | Prioritario | Dedicado |
| Logo personalizado | ❌ | ✅ | ✅ | ✅ |
| Dominio personalizado | ❌ | ❌ | ✅ | ✅ |

### 3.2 Fase 2 - Portal Vecinos

| Feature | Descripción |
|---------|-------------|
| Login propietarios/inquilinos | Magic link o password |
| Ver expensas propias | Histórico de liquidaciones |
| Descargar PDFs | Acceso a sus documentos |
| Informar pagos | Subir comprobante |
| Ver estado de cuenta | Deuda, pagos, saldo |
| Reclamos | Crear, seguir estado |
| Reserva amenities | SUM, parrilla, etc |
| Notificaciones push | Web push notifications |

### 3.3 Fase 3 - Integraciones

| Integración | Descripción |
|-------------|-------------|
| MercadoPago cobros | QR, link de pago en expensa |
| AFIP | Facturación electrónica |
| Sueldos encargados | Liquidación según CCT |
| App móvil | React Native / Expo |
| WhatsApp Business | Notificaciones |
| Bancos | Conciliación automática |
| **Parsing de Facturas con IA** | Extracción automática de datos de facturas de proveedores |

---

## 3.4 Feature Premium: Parsing de Facturas de Proveedores con IA

### Contexto y Valor

Los administradores de consorcios reciben facturas de múltiples proveedores cada mes:
- **Servicios públicos**: EDESUR, Metrogas, AySA, Telecentro
- **Impuestos**: ABL, ARBA
- **Servicios**: Ascensores (OTIS, Schindler), fumigación, limpieza
- **Otros**: Seguros, matafuegos, etc.

**Pain point actual**: Cargar manualmente los datos de cada factura es tedioso y propenso a errores.

**Solución**: Subir la factura (PDF/imagen) y que la IA extraiga automáticamente:
- Proveedor
- Monto total
- Fecha de vencimiento
- Número de factura/comprobante
- Concepto/servicio
- Período facturado

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO: PARSING DE FACTURAS CON IA                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │ Admin sube   │    │ Preproceso   │    │ Claude API   │    │ Formulario   │  │
│   │ factura PDF  │───►│ (PDF→imagen) │───►│ Vision       │───►│ prellenado   │  │
│   │ o imagen     │    │              │    │              │    │ (editable)   │  │
│   └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                                    │            │
│                                                                    ▼            │
│                                                           ┌──────────────┐      │
│                                                           │ Guardar en   │      │
│                                                           │ gastos_      │      │
│                                                           │ periodo      │      │
│                                                           └──────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Selección de Modelo

| Opción | Pros | Contras | Costo estimado |
|--------|------|---------|----------------|
| **Claude API (Vision)** | Excelente OCR, entiende contexto argentino, API simple | Costo por request | ~$0.02-0.05/factura |
| Google Vision + GPT | Más barato OCR, GPT para parsing | 2 llamadas, más complejo | ~$0.01-0.03/factura |
| Ollama local | Sin costo de API | Requiere GPU, más lento, menos preciso | $0 (hardware) |
| Tesseract + regex | Gratis, rápido | Frágil, facturas varían mucho | $0 |

**Decisión recomendada**: **Claude API con Vision** (claude-3-haiku-20240307 o claude-3-sonnet)
- Mejor relación costo/calidad para volumen moderado
- Un solo request hace OCR + parsing + estructuración
- Entiende formatos argentinos (CUIT, fechas DD/MM/AAAA, moneda ARS)

### Implementación Técnica

#### 1. API Route para procesar factura

```typescript
// app/api/facturas/parse/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

interface FacturaParseada {
  proveedor: string;
  cuit_proveedor?: string;
  monto_total: number;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  numero_factura?: string;
  concepto: string;
  periodo_facturado?: string;
  confianza: 'alta' | 'media' | 'baja';
  campos_faltantes: string[];
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('factura') as File;

  if (!file) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
  }

  // Convertir a base64
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

  // Si es PDF, convertir primera página a imagen (pdf-lib + sharp)
  let imageData = base64;
  let imageMediaType = mediaType;

  if (mediaType === 'application/pdf') {
    // TODO: Implementar conversión PDF → PNG
    // const pngBuffer = await pdfToImage(bytes);
    // imageData = pngBuffer.toString('base64');
    // imageMediaType = 'image/png';
  }

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Más económico, suficiente para facturas
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageMediaType,
              data: imageData
            }
          },
          {
            type: 'text',
            text: `Analiza esta factura de servicio de Argentina y extrae los siguientes datos en formato JSON:

{
  "proveedor": "nombre del proveedor o empresa",
  "cuit_proveedor": "número de CUIT si está visible",
  "monto_total": número (solo el valor, sin símbolo de moneda),
  "fecha_emision": "DD/MM/AAAA",
  "fecha_vencimiento": "DD/MM/AAAA",
  "numero_factura": "número de factura o comprobante",
  "concepto": "tipo de servicio (ej: Electricidad, Gas Natural, Agua, ABL, Ascensor)",
  "periodo_facturado": "mes/año o rango de fechas facturado",
  "confianza": "alta" | "media" | "baja",
  "campos_faltantes": ["lista de campos que no pudiste identificar"]
}

Responde SOLO con el JSON, sin explicaciones adicionales.
Si un campo no es legible o no está presente, usa null.
Para el monto, usa el TOTAL A PAGAR final.`
          }
        ]
      }
    ]
  });

  try {
    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Respuesta inesperada');
    }

    const parsed: FacturaParseada = JSON.parse(textContent.text);

    return NextResponse.json({
      success: true,
      data: parsed,
      tokens_usados: response.usage?.input_tokens + response.usage?.output_tokens
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'No se pudo parsear la respuesta de la IA',
      raw: response.content
    }, { status: 500 });
  }
}
```

#### 2. Componente de UI

```tsx
// components/FacturaUploader.tsx
'use client';

import { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';

interface FacturaData {
  proveedor: string;
  monto_total: number;
  fecha_vencimiento: string;
  numero_factura: string;
  concepto: string;
  confianza: 'alta' | 'media' | 'baja';
}

export function FacturaUploader({ onDataExtracted }: { onDataExtracted: (data: FacturaData) => void }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<FacturaData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Enviar a la API
    const formData = new FormData();
    formData.append('factura', file);

    try {
      const res = await fetch('/api/facturas/parse', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();

      if (result.success) {
        setExtractedData(result.data);
      } else {
        setError(result.error || 'Error procesando factura');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
    }
  };

  return (
    <div className="factura-uploader">
      {/* Dropzone */}
      <div
        className="dropzone"
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFileUpload(file);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <Upload className="w-8 h-8 text-gray-400" />
        <p>Arrastrá una factura (PDF o imagen)</p>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Analizando factura con IA...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-state">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados */}
      {extractedData && (
        <div className="extracted-data">
          <h4>Datos extraídos:</h4>

          <div className={`confidence-badge ${extractedData.confianza}`}>
            Confianza: {extractedData.confianza}
          </div>

          <div className="data-fields">
            <label>Proveedor</label>
            <input value={extractedData.proveedor} readOnly />

            <label>Monto</label>
            <input value={`$${extractedData.monto_total.toLocaleString('es-AR')}`} readOnly />

            <label>Vencimiento</label>
            <input value={extractedData.fecha_vencimiento || 'No detectado'} readOnly />

            <label>Concepto</label>
            <input value={extractedData.concepto} readOnly />
          </div>

          <div className="actions">
            <button onClick={handleConfirm} className="btn-primary">
              <Check className="w-4 h-4" />
              Usar estos datos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Integración con Carga de Gastos

El flujo completo sería:

```
1. Admin va a /expensas/[periodoId]/gastos
2. Click en "Agregar gasto" → Modal con 2 tabs:
   - Tab "Manual": Formulario tradicional
   - Tab "Desde factura": FacturaUploader
3. Si usa FacturaUploader:
   - Sube imagen/PDF
   - IA extrae datos en ~2-3 segundos
   - Admin revisa, corrige si es necesario
   - Click "Usar estos datos" → llena el formulario de gasto
   - Click "Guardar" → persiste en gastos_periodo
```

### Costos Estimados

| Escenario | Facturas/mes | Costo API/mes | Por consorcio |
|-----------|--------------|---------------|---------------|
| Básico | 100 | ~$2-5 USD | $0.02-0.05/factura |
| Medio | 500 | ~$10-25 USD | - |
| Alto | 2000 | ~$40-100 USD | - |

**Modelo de monetización**:
- Plan Free: 5 facturas/mes con IA
- Plan Básico: 20 facturas/mes
- Plan Pro: 100 facturas/mes
- Plan Enterprise: Ilimitado

### Proveedores Argentinos Soportados (Ejemplos de Entrenamiento)

Para mejorar la precisión, el prompt puede incluir contexto sobre formatos comunes:

```
Proveedores comunes y sus formatos:
- EDESUR/EDENOR: "TOTAL A PAGAR", fecha formato DD/MM/AAAA
- Metrogas: "Total con IVA", período "MMM-AAAA"
- AySA: "Importe Total", número de cuenta
- ABL (CABA): "Monto a Abonar", cuota X de Y
- ARBA: "Importe Determinado", año fiscal
- Ascensores (OTIS, Schindler): Factura tipo A/B, CUIT
```

### Consideraciones de Seguridad

1. **Datos sensibles**: Las facturas pueden contener datos del consorcio
   - No persistir imágenes en logs
   - Usar HTTPS siempre
   - Considerar procesamiento efímero (no guardar en Anthropic)

2. **Rate limiting**:
   - Limitar requests por consorcio/minuto
   - Cola para procesamiento batch

3. **Fallback manual**:
   - Siempre permitir editar datos extraídos
   - Si la confianza es "baja", mostrar advertencia

### Roadmap de Implementación

| Fase | Descripción | Dependencias |
|------|-------------|--------------|
| **IA-1** | API básica con Claude Vision | Cuenta Anthropic |
| **IA-2** | UI de upload + preview | Fase 1 completa |
| **IA-3** | Conversión PDF→imagen | pdf-lib, sharp |
| **IA-4** | Integración con formulario de gastos | CRUD gastos |
| **IA-5** | Historial de facturas parseadas | Storage facturas |
| **IA-6** | Mejoras de prompt por proveedor | Feedback usuarios |

---

## 4. Costos de Infraestructura

### 4.1 Costos Base Mensuales (USD)

| Servicio | Free | 10 consorcios | 50 consorcios | 100 consorcios |
|----------|------|---------------|---------------|----------------|
| **Supabase** | $0 | $25 | $25 | $25 + uso |
| **Resend** | $0 | $0 | $20 | $20 |
| **Netlify** | $0 | $0 | $19 | $19 |
| **Dominio** | - | $12/año | $12/año | $12/año |
| **Sentry** | $0 | $0 | $0 | $26 |
| **Total USD** | **$0** | **~$26** | **~$65** | **~$91** |

### 4.2 Estimación de Uso

**Supuestos por consorcio promedio:**
- 40 unidades
- 1 liquidación/mes
- 40 PDFs/mes
- 80 emails/mes (propietario + inquilino)
- 200MB storage/año

| Métrica | 10 consorcios | 50 consorcios | 100 consorcios |
|---------|---------------|---------------|----------------|
| Unidades totales | 400 | 2,000 | 4,000 |
| Emails/mes | 800 | 4,000 | 8,000 |
| PDFs/mes | 400 | 2,000 | 4,000 |
| Storage acumulado | 2GB | 10GB | 20GB |
| MAUs (admins) | 20 | 100 | 200 |

### 4.3 Proyección de Ingresos vs Costos (ARS)

**Tipo de cambio asumido**: 1 USD = 1,200 ARS

| Escenario | Consorcios | Ingreso/mes | Costo/mes | Margen |
|-----------|------------|-------------|-----------|--------|
| MVP | 1 (beta) | $0 | ~$0 | - |
| Lanzamiento | 10 | $400,000 | ~$31,000 | 92% |
| Crecimiento | 50 | $2,500,000 | ~$78,000 | 97% |
| Escala | 100 | $6,000,000 | ~$110,000 | 98% |

**Nota**: Ingreso promedio estimado $50,000/consorcio (mix de planes)

### 4.4 MercadoPago: Costos por Suscripción

| Operación | Comisión |
|-----------|----------|
| Cobro suscripción | 4.99% - 6.99% + IVA |
| Acreditación inmediata | +2% |
| Ejemplo: $60,000/mes | ~$4,500 comisión |

---

## 5. Plan de Migración

### 5.1 Qué Reutilizar ⚠️ ACTUALIZADO

Referencia: Ver [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) para detalles del sistema actual.

| Componente | Archivo Actual | Reutilizable | Acción |
|------------|----------------|--------------|--------|
| **Templates HTML emails** | `templates/*.html` | ✅ 100% | Convertir a React Email (`/emails`) |
| **Estilos Tailwind** | `app/globals.css` | ✅ 80% | Adaptar a shadcn/ui |
| **Parseo de Excel** | `app/api/excel/route.ts` + `xlsx` | ✅ 90% | Reutilizar para import opcional |
| **Streaming SSE** | `app/api/enviar/route.ts` | ✅ 70% | Mantener patrón para progreso de envío |
| **Componentes UI** | `components/*.tsx` | ✅ 60% | Migrar Modal, Toast, Badge, FileUpload |
| **Helpers utils** | `lib/utils.ts` | ✅ 100% | `cn()`, validaciones, formateo |
| **Lógica de prorrateo** | Nuevo | ✅ N/A | Crear en `lib/utils/prorrateo.ts` |
| API de envío (Python) | `python/expensas.py` | ❌ 0% | Reescribir con Resend |
| SQLite/better-sqlite3 | `lib/db.ts` | ❌ 0% | Migrar a PostgreSQL/Prisma |
| OAuth Gmail | `credentials.json` | ❌ 0% | Reemplazar por Resend |

#### Componentes a migrar del sistema actual

```typescript
// Componentes reutilizables (adaptar a shadcn/ui)
// Fuente: components/*.tsx

Modal.tsx           → Dialog de shadcn/ui
Toast.tsx           → Toast de shadcn/ui (sonner)
Badge.tsx           → Badge de shadcn/ui
FileUpload.tsx      → Dropzone + Input file
SendingProgress.tsx → Progress de shadcn/ui + SSE listener
ExcelDataViewer.tsx → Table de shadcn/ui + lógica de preview
```

#### Streaming SSE para progreso (mantener patrón)

El sistema actual usa SSE para mostrar progreso de envío en tiempo real:
```typescript
// Patrón actual en app/api/enviar/route.ts
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    // Emitir eventos línea por línea
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  }
});

// Mantener este patrón para:
// - Envío masivo de emails
// - Generación batch de PDFs
// - Importación de Excel
```

### 5.2 Migración de Datos

```typescript
// Script de migración del beta tester
async function migrarConsorcioConstitución() {
  // 1. Crear organización
  const org = await prisma.organization.create({
    data: {
      name: 'Administración Cabrera',
      plan: 'pro', // Beta gratis pero con features Pro
      billing_email: 'admin@example.com'
    }
  });

  // 2. Crear consorcio
  const consorcio = await prisma.consorcio.create({
    data: {
      organization_id: org.id,
      nombre: 'Consorcio Constitución 2226',
      direccion: 'Constitución 2226, CABA',
      cuit: '30-12345678-9',
      config: {
        cbu: '0290039110000639501407',
        alias: 'TORSO.PLATISTA.PEZ',
        banco: 'Banco Ciudad'
      }
    }
  });

  // 3. Migrar unidades desde Excel/SQLite actual
  const unidadesActuales = await sqliteDb.all('SELECT * FROM unidades');

  for (const u of unidadesActuales) {
    await prisma.unidad.create({
      data: {
        consorcio_id: consorcio.id,
        numero_uf: u.n,
        piso_depto: u.depto,
        tipo: u.tipo,
        coef_fiscal: u.coef || 1/33, // Calcular si no existe
        propietario_nombre: u.nombre,
        propietario_email: u.email_propietario,
        inquilino_email: u.email_inquilino
      }
    });
  }

  // 4. Conceptos de gasto ⚠️ NO se crean por defecto
  // El admin del consorcio los crea desde /configuracion/conceptos
  // según la realidad de SU edificio (no hay rubros universales)
  //
  // Flujo de onboarding sugerido:
  // 1. Crear consorcio → 2. Modal "Agregá tus primeros conceptos de gasto"
  // 3. Sugerir categorías comunes (Ordinarias A, Ordinarias B, Extraordinarias)
  // 4. El admin elige nombres y tipos de prorrateo
}

// Ejemplo de conceptos que el admin podría crear:
// - "Sueldo encargado" (A, por_coef)
// - "ABL" (A, por_coef)
// - "Ascensor" (B, por_coef)
// - "Fondo de reserva" (B, por_uf)
// Pero NO se imponen - cada consorcio tiene su estructura
```

### 5.3 Checklist Pre-Migración

- [ ] Exportar datos actuales a JSON/CSV
- [ ] Verificar emails de todas las unidades
- [ ] Obtener coeficientes fiscales (si no existen, calcular proporcional)
- [ ] Configurar Supabase proyecto
- [ ] Configurar Resend con dominio verificado
- [ ] Crear cuenta MercadoPago vendedor
- [ ] Diseñar nuevo template de liquidación
- [ ] Testing con datos reales en staging

---

## 6. Análisis de Riesgos

### 6.1 Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Timeout en PDF** | Media | Alto | Usar @react-pdf (< 3s), Background Functions si necesario |
| **Límite emails Resend** | Baja | Medio | Plan Pro (50K), cola de envío |
| **Cold starts Netlify** | Media | Bajo | Funciones livianas, Edge Functions para críticas |
| **RLS mal configurado** | Alta | Crítico | Tests automatizados, auditoría pre-launch |
| **Migración datos** | Media | Alto | Script probado, rollback plan |

### 6.2 Riesgos de Negocio

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Competencia establecida** | Alta | Alto | Nicho específico, precio agresivo, UX superior |
| **Churn alto** | Media | Alto | Onboarding guiado, soporte proactivo |
| **Adopción lenta** | Media | Medio | Beta tester como caso de éxito, referidos |
| **Cambios regulatorios** | Baja | Medio | Arquitectura flexible, actualizaciones rápidas |

### 6.3 Riesgos Financieros

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Costos escalan mal** | Baja | Medio | Monitoreo, spend caps, optimización |
| **Morosidad suscripciones** | Media | Medio | Cobro anticipado, suspensión automática |
| **Tipo de cambio** | Alta | Medio | Precios en ARS, revisar trimestralmente |

### 6.4 Comparativa con Competencia

| Aspecto | ConsorcioAbierto | Octavo Piso | **Nosotros** |
|---------|------------------|-------------|--------------|
| Precio base | ~$50K/mes | ~$80K/mes | **$0 (free tier)** |
| Setup | Complejo | Medio | **Autoservicio** |
| UX | Anticuada | Aceptable | **Moderna** |
| Mobile | No | App básica | **PWA (Fase 2)** |
| Soporte | Telefónico | Email | **Chat + Docs** |
| Diferenciador | Mercado, trayectoria | Funcionalidades | **Precio, UX, autogestión** |

---

## 7. Roadmap

### 7.1 Fases de Desarrollo ⚠️ ACTUALIZADO

```
FASE 1: MVP Core
├── Setup proyecto (Supabase, Prisma, Next.js)
├── Auth + Onboarding
├── CRUD Consorcio/Unidades/Conceptos
├── UI básica con shadcn/ui
├── Liquidación
│   ├── Crear período
│   ├── Cargar gastos (manual + import Excel)
│   ├── Calcular prorrateo
│   ├── Generar PDFs
│   └── Preview liquidación
├── Comunicaciones
│   ├── Integrar Resend
│   ├── Envío masivo (expensas + avisos generales)
│   └── Historial
├── Pagos & Cobranzas
│   ├── Registrar pagos
│   ├── Estado de cuenta
│   └── Lista deudores
└── Billing
    ├── Integrar MercadoPago
    ├── Planes y límites
    └── Landing page

FASE 2: Portal Vecinos
├── Login propietarios/inquilinos
├── Ver expensas propias
├── Informar pagos
├── Reclamos
└── Reserva amenities

FASE 3: Integraciones
├── App móvil PWA
├── MercadoPago cobros (QR en expensa)
├── AFIP (facturación electrónica)
└── WhatsApp Business
```

### 7.2 Milestones ⚠️ ACTUALIZADO

| Milestone | Criterio de Éxito |
|-----------|-------------------|
| **M1: Skeleton** | Auth + CRUD funcionando en local |
| **M2: Liquidación** | Generar PDF de expensa completo |
| **M3: Envío** | Enviar emails reales con adjuntos |
| **M4: Beta Live** | 1 liquidación real enviada a Consorcio Constitución |
| **M5: Launch** | Billing activo, landing online |
| **M6: 10 Clientes** | 10 consorcios pagando |

### 7.3 Definición de "Done" por Feature

**Para considerar una feature completa:**

1. ✅ Código funcionando en producción
2. ✅ Tests básicos (happy path)
3. ✅ RLS configurado y testeado
4. ✅ UI responsive (mobile-first)
5. ✅ Manejo de errores con feedback al usuario
6. ✅ Loading states
7. ✅ Documentación mínima (si es API)

---

## 8. Decisiones Arquitectónicas (ADR)

### ADR-001: Multi-tenancy con RLS

**Contexto**: Necesitamos aislar datos entre consorcios.

**Decisión**: Usar Row-Level Security de Supabase con `consorcio_id` en cada tabla.

**Consecuencias**:
- (+) Simple, económico
- (+) Nativo de Supabase
- (-) Requiere cuidado en cada query
- (-) Todas las tablas necesitan `consorcio_id`

### ADR-002: PDFs con @react-pdf/renderer

**Contexto**: Puppeteer no es viable en Netlify (timeout, memory).

**Decisión**: Usar @react-pdf/renderer para generar PDFs.

**Consecuencias**:
- (+) Rápido (< 3s)
- (+) Serverless-friendly
- (+) Templates en React
- (-) Menos flexibilidad que HTML/CSS
- (-) Curva de aprendizaje en estilos

### ADR-003: Resend vs Gmail API

**Contexto**: El sistema actual usa Gmail API con OAuth.

**Decisión**: Migrar a Resend.

**Consecuencias**:
- (+) Deliverability profesional
- (+) Sin manejo de OAuth por usuario
- (+) Métricas de apertura/clicks
- (-) Costo por volumen
- (-) Dominio propio requerido

### ADR-004: Prisma vs Supabase Client

**Contexto**: Supabase tiene su propio cliente JS.

**Decisión**: Usar Prisma como ORM principal.

**Consecuencias**:
- (+) Type-safety completo
- (+) Migraciones versionadas
- (+) Familiar si ya lo usás
- (-) Overhead adicional
- (-) RLS manual en algunas queries

---

## 9. Métricas de Éxito

### 9.1 Técnicas

| Métrica | Target |
|---------|--------|
| Tiempo generación PDF | < 5s |
| Uptime | > 99.5% |
| Tiempo carga dashboard | < 2s |
| Errores en producción | < 1/día |

### 9.2 Producto

| Métrica | Target M6 | Target Año 1 |
|---------|-----------|--------------|
| Consorcios activos | 10 | 50 |
| Unidades gestionadas | 400 | 2,000 |
| Liquidaciones/mes | 400 | 2,000 |
| Churn mensual | < 5% | < 3% |

### 9.3 Negocio

| Métrica | Target Año 1 |
|---------|--------------|
| MRR | $2,000,000 ARS |
| CAC | < $50,000 ARS |
| LTV | > $500,000 ARS |
| LTV/CAC | > 10 |

---

## 10. Próximos Pasos Inmediatos

### Semana 1-2

- [ ] Crear proyecto en Supabase
- [ ] Configurar Next.js 15 con Prisma
- [ ] Definir schema Prisma inicial
- [ ] Setup auth con Supabase
- [ ] Configurar Netlify con GitHub

### Semana 3-4

- [ ] UI: Layout dashboard con sidebar
- [ ] CRUD Consorcio (crear, editar)
- [ ] CRUD Unidades (lista, crear, editar)
- [ ] Configurar shadcn/ui

### Para Después

- [ ] Registrar dominio
- [ ] Configurar Resend
- [ ] Cuenta MercadoPago vendedor
- [ ] Diseñar landing page

---

*Documento creado: Enero 2026*
*Última actualización: v1.1 - Correcciones de conceptos, roles, tipos de envío y compatibilidad*
