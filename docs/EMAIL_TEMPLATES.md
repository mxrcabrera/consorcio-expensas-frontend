# Email Templates - Guia de Estilos

## Problemas conocidos con Gmail

Gmail tiene restricciones muy estrictas sobre CSS. Los siguientes puntos son CRITICOS para que los emails se vean correctamente:

### 1. Gmail ignora CSS en `<style>` del head

Gmail stripea completamente los bloques `<style>`. **TODO el estilo debe ser inline**.

```html
<!-- MAL - Gmail lo ignora -->
<style>
  p { color: red; }
</style>
<p>Texto</p>

<!-- BIEN - Gmail lo respeta -->
<p style="color: red;">Texto</p>
```

### 2. Los colores deben estar en el elemento mas interno

Gmail puede heredar colores de elementos padre. Para asegurar que se vea correctamente, poner el color en el tag mas interno:

```html
<!-- MAL - El color puede perderse -->
<p style="color: #cc0000;">
  <strong>Texto importante</strong>
</p>

<!-- BIEN - El color se mantiene -->
<p>
  <strong style="color: #cc0000;">Texto importante</strong>
</p>
```

### 3. Evitar CSS classes

Gmail no soporta clases CSS. Nunca usar:
- `class="nombre-clase"`
- Clases de Tailwind como `font-claude-response-body`

### 4. No anidar tags de bloque incorrectamente

HTML invalido causa problemas de renderizado:

```html
<!-- MAL - <p> dentro de <h3> es invalido -->
<h3>
  <p>Texto</p>
</h3>

<!-- BIEN - Usar solo <p> con estilos inline -->
<p style="font-weight: bold; font-size: 16px;">Texto</p>
```

## Estructura de Templates

### Plantilla principal (expensas.html, corte_luz.html, etc.)

Cada plantilla debe ser un documento HTML completo:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        /* CSS aqui es solo para el editor, Gmail lo ignora */
        body { font-family: 'Trebuchet MS', Arial, sans-serif; }
    </style>
</head>
<body>
    <div style="font-family: 'Trebuchet MS', Arial, sans-serif; color: #1f4e78;">
        <!-- Contenido con TODOS los estilos inline -->
        <p style="font-family: 'Trebuchet MS', Arial, sans-serif; margin: 0 0 10px 0;">
            Texto del email...
        </p>
    </div>
</body>
</html>
```

### Firma (firma.html)

La firma se extrae automaticamente del `<body>` y se inserta antes del cierre de `</body>` de la plantilla principal.

Colores de la firma:
- "Saludos cordiales" -> azul `#1f4e78`
- Nombres de administradores -> negro `#000000`
- "Horario de atencion" -> rojo `#cc0000`
- Email de contacto -> azul link `#0066cc`

```html
<body>
    <br>
    <p style="font-family: 'Trebuchet MS', Arial, sans-serif; margin: 0 0 10px 0;">
        <strong style="color: #1f4e78;">Saludos cordiales,</strong>
    </p>

    <p style="font-family: 'Trebuchet MS', Arial, sans-serif; margin: 0 0 3px 0;">
        <em><strong style="color: #000000;">Propietarios Administradores:</strong></em>
    </p>

    <hr style="border: none; border-top: 1px solid #cccccc; margin: 15px 0;">

    <p style="font-family: 'Trebuchet MS', Arial, sans-serif; margin: 0 0 5px 0;">
        <strong style="color: #cc0000;">Horario de atencion: lunes a viernes de 10 a 18hs.</strong>
    </p>

    <p style="font-family: 'Trebuchet MS', Arial, sans-serif; margin: 0;">
        <a href="mailto:email@gmail.com" style="color: #0066cc; text-decoration: none;">
            email@gmail.com
        </a>
    </p>
</body>
```

## Variables disponibles

Las variables se reemplazan automaticamente al enviar:

| Variable | Descripcion | Usado en |
|----------|-------------|----------|
| `{mes_expensas}` | Mes de las expensas (ej: "Diciembre 2025") | expensas.html |
| `{fecha_corte}` | Fecha del corte programado | corte_luz.html |
| `{nombre}` | Nombre del destinatario | aviso_general.html |
| `{depto}` | Departamento | aviso_general.html |

## Checklist antes de editar templates

- [ ] Todo el CSS esta inline (no en `<style>`)
- [ ] Los colores estan en el elemento mas interno (`<strong>`, `<a>`, etc.)
- [ ] No hay clases CSS
- [ ] No hay emojis (Gmail en Windows puede tener problemas de encoding)
- [ ] La estructura HTML es valida (no `<p>` dentro de `<h3>`)
- [ ] Cada `<p>` tiene `font-family` inline

## Ubicacion de archivos

Los templates se guardan en dos lugares que deben estar sincronizados:

1. **Desarrollo:** `./templates/` (en el repo)
2. **Produccion:** `C:/Expensas/Plantillas/` (donde Python los lee)

Despues de editar, copiar a produccion:
```bash
cp ./templates/*.html C:/Expensas/Plantillas/
```

## Python: Como se combinan plantilla + firma

El archivo `python/expensas.py` tiene dos funciones clave:

1. `cargar_archivo_html(nombre, solo_body=False)` - Carga un template. Con `solo_body=True` extrae solo el contenido del `<body>`.

2. `combinar_plantilla_con_firma(plantilla_html, firma_body)` - Inserta la firma antes del `</body>` de la plantilla.

La firma siempre se carga con `solo_body=True` para evitar duplicar `<html>`, `<head>`, etc.
