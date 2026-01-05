"""
Sistema de Envio Automatico de Expensas - Refactorizado
Octubre 2025
"""
import sys
sys.stdout.reconfigure(line_buffering=True)

import os
import pickle
import base64
import re
import json
from datetime import datetime, timedelta

import pandas as pd
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


# ============ CONFIGURACIÓN ============
class Config:
    SCOPES = ['https://www.googleapis.com/auth/gmail.send']
    
    # Rutas
    BASE_DIR = "C:/Expensas"
    PDFS_DIR = BASE_DIR
    LOGS_DIR = f"{BASE_DIR}/Logs"
    PLANTILLAS_DIR = f"{BASE_DIR}/Plantillas"
    DATOS_MAESTRO = f"{BASE_DIR}/datos_maestro.xlsx"
    EXCEL_RECAUDACION = f"{BASE_DIR}/Planilla recaudacion SEPTIEMBRE 25.xlsm"
    
    # Modo test
    MODO_TEST = True
    EMAIL_TEST = "cabreramxr@gmail.com"
    CANTIDAD_TEST = None  # None = usar todas las unidades del Excel
    TEST_EMAIL_COUNT = 0  # 0 = enviar todos, >0 = limitar cantidad
    
    # Remitente
    NOMBRE_REMITENTE = "Consorcio Constitución 2226"
    EMAIL_REMITENTE = "consorcio.constitucion.2226@gmail.com"
    
    # Archivos
    TOKEN_FILE = 'token.pickle'
    CREDENTIALS_FILE = 'credentials.json'

    AUTO_CONFIRM = False
    
    MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

    @classmethod
    def load_from_building(cls, building_config: dict):
        """Carga configuracion desde un edificio (pasado por el frontend)"""
        if not building_config:
            return

        if building_config.get('nombre_remitente'):
            cls.NOMBRE_REMITENTE = building_config['nombre_remitente']

        if building_config.get('email_remitente'):
            cls.EMAIL_REMITENTE = building_config['email_remitente']

        if building_config.get('ruta_base'):
            cls.BASE_DIR = building_config['ruta_base']
            # PDFs estan directamente en ruta_base (no en subdirectorio)
            cls.PDFS_DIR = cls.BASE_DIR
            cls.LOGS_DIR = os.path.join(cls.BASE_DIR, 'Logs')
            os.makedirs(cls.LOGS_DIR, exist_ok=True)


# ============ INICIALIZACIÓN ============
os.makedirs(Config.LOGS_DIR, exist_ok=True)
os.makedirs(Config.PLANTILLAS_DIR, exist_ok=True)


# ============ UTILIDADES FECHA ============
def obtener_mes_expensas():
    """Retorna el mes anterior al actual para expensas"""
    hoy = datetime.now()
    mes_anterior = 12 if hoy.month == 1 else hoy.month - 1
    año = hoy.year - 1 if hoy.month == 1 else hoy.year
    mes_nombre = Config.MESES[mes_anterior - 1].capitalize()
    return f"{mes_nombre} {año}"


def formatear_fecha_corte(dias_adelante=5):
    """Formatea fecha de corte en español"""
    fecha = datetime.now() + timedelta(days=dias_adelante)
    dia_semana = Config.DIAS_SEMANA[fecha.weekday()]
    mes = Config.MESES[fecha.month - 1]
    return f"{dia_semana} {fecha.day} de {mes} de {fecha.year}"


# ============ AUTENTICACIÓN ============
def autenticar_gmail():
    """Autentica con Gmail API usando OAuth2"""
    creds = None
    
    if os.path.exists(Config.TOKEN_FILE):
        with open(Config.TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(Config.CREDENTIALS_FILE, Config.SCOPES)
            creds = flow.run_local_server(port=0)
        
        with open(Config.TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)
    
    return build('gmail', 'v1', credentials=creds)


# ============ MANEJO DE ARCHIVOS ============
def cargar_archivo_html(nombre, solo_body=False):
    """Carga archivo HTML desde carpeta de plantillas

    Args:
        nombre: Nombre del archivo sin extension
        solo_body: Si es True, extrae solo el contenido dentro de <body>
    """
    ruta = f"{Config.PLANTILLAS_DIR}/{nombre}.html"

    if not os.path.exists(ruta):
        print(f"[ERROR] No se encontro {nombre}.html en {Config.PLANTILLAS_DIR}")
        return None

    with open(ruta, 'r', encoding='utf-8') as f:
        contenido = f.read()

    if solo_body:
        # Extraer solo el contenido del body
        match = re.search(r'<body[^>]*>(.*?)</body>', contenido, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return contenido


def combinar_plantilla_con_firma(plantilla_html, firma_body):
    """Combina plantilla HTML con firma insertandola antes del cierre de body

    La firma se inserta despues del ultimo </div> pero antes de </body>
    para evitar heredar estilos del contenedor principal.
    """
    # Buscar el cierre de </body> y insertar firma antes
    if '</body>' in plantilla_html.lower():
        # Encontrar posicion del </body> (case insensitive)
        match = re.search(r'</body>', plantilla_html, re.IGNORECASE)
        if match:
            pos = match.start()
            # Envolver firma en su propio div para aislar estilos
            firma_wrapped = f'\n    <div style="font-family: \'Trebuchet MS\', Arial, sans-serif;">\n{firma_body}\n    </div>\n'
            return plantilla_html[:pos] + firma_wrapped + plantilla_html[pos:]
    # Si no hay </body>, simplemente concatenar
    return plantilla_html + firma_body


def validar_pdfs(numeros):
    """Valida existencia de PDFs de expensas"""
    faltantes = []
    for n in numeros:
        for tipo in ['Expensas', 'Detalle expensas']:
            pdf = f"{Config.PDFS_DIR}/{tipo} {n}.pdf"
            if not os.path.exists(pdf):
                faltantes.append(f"{tipo} {n}.pdf")
    return faltantes


def pdfs_completos(numero):
    """Verifica si una unidad tiene ambos PDFs"""
    pdf1 = f"{Config.PDFS_DIR}/Expensas {numero}.pdf"
    pdf2 = f"{Config.PDFS_DIR}/Detalle expensas {numero}.pdf"
    return os.path.exists(pdf1) and os.path.exists(pdf2)


def obtener_pdfs_unidad(numero):
    """Obtiene rutas de PDFs de una unidad"""
    return [
        f"{Config.PDFS_DIR}/Expensas {numero}.pdf",
        f"{Config.PDFS_DIR}/Detalle expensas {numero}.pdf"
    ]


# ============ LOGS ============
def log_envio(tipo, destinatario, depto, exito, error=None):
    """Registra envío en archivo de log"""
    fecha = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    log_file = f"{Config.LOGS_DIR}/envios_{tipo}_{datetime.now().strftime('%Y%m%d')}.txt"
    
    estado = "[OK] ENVIADO" if exito else f"[ERROR] {error}"
    linea = f"[{fecha}] {depto} ({destinatario}) - {estado}\n"
    
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(linea)


# ============ EMAILS ============
def procesar_email_cc(email_cc):
    """Procesa campo de email CC (maneja vacíos, NaN, etc)"""
    if pd.isna(email_cc) or not email_cc or str(email_cc).strip() == '':
        return None
    
    email_str = str(email_cc).strip()
    if ';' in email_str:
        email_str = email_str.replace(';', ',')
    
    return email_str


def crear_email(destinatario, asunto, cuerpo_html, archivos_adjuntos=None, cc=None):
    """Crea mensaje de email con formato HTML y adjuntos"""
    mensaje = MIMEMultipart()
    # Formato RFC 5322 estándar para mostrar nombre y email
    mensaje['From'] = f'"Consorcio Constitucion 2226" <{Config.EMAIL_REMITENTE}>'
    mensaje['to'] = destinatario
    mensaje['subject'] = asunto
    
    if cc:
        mensaje['cc'] = cc if isinstance(cc, str) else ', '.join(cc)
    
    mensaje.attach(MIMEText(cuerpo_html, 'html', 'utf-8'))
    
    if archivos_adjuntos:
        for archivo in archivos_adjuntos:
            if os.path.exists(archivo):
                with open(archivo, 'rb') as f:
                    adjunto = MIMEApplication(f.read(), _subtype='pdf')
                    adjunto.add_header('Content-Disposition', 'attachment', 
                                     filename=os.path.basename(archivo))
                    mensaje.attach(adjunto)
    
    raw = base64.urlsafe_b64encode(mensaje.as_bytes()).decode()
    return {'raw': raw}


def enviar_email(service, email_mensaje):
    """Envía email usando Gmail API"""
    try:
        message = service.users().messages().send(userId="me", body=email_mensaje).execute()
        return True, message['id']
    except Exception as error:
        return False, str(error)


# ============ INTERFAZ USUARIO ============
def html_a_texto_simple(html):
    """Convierte HTML a texto plano para vista previa"""
    texto = html
    texto = re.sub(r'</h[12]>', '\n\n', texto)
    texto = re.sub(r'</p>', '\n\n', texto)
    texto = re.sub(r'<br\s*/?>', '\n', texto)
    texto = re.sub(r'</li>', '\n', texto)
    texto = re.sub(r'<li[^>]*>', '  • ', texto)
    texto = re.sub(r'<ul[^>]*>', '\n', texto)
    texto = re.sub(r'</ul>', '\n', texto)
    texto = re.sub(r'<hr[^>]*>', '\n' + '-'*60 + '\n', texto)
    texto = re.sub(r'<[^<]+?>', '', texto)
    texto = re.sub(r' +', ' ', texto)
    texto = re.sub(r'\n\s*\n\s*\n+', '\n\n', texto)
    return texto.strip()


def confirmar_accion(mensaje="¿CONFIRMAR?"):
    """Solicita confirmación al usuario"""
    if Config.AUTO_CONFIRM:
        print(f"{mensaje} -> AUTO-CONFIRMADO", flush=True)
        return True
    respuesta = input(f"{mensaje} (S/N): ")
    return respuesta.upper() == 'S'


def imprimir_header(titulo, modo_test=False):
    """Imprime header decorado"""
    print("\n" + "="*60)
    if modo_test:
        print(f"[TEST] {titulo}")
    else:
        print(titulo)
    print("="*60 + "\n")


def imprimir_resumen_final(enviados, errores, salteados=0):
    """Imprime resumen de envios"""
    print("\n" + "="*60)
    print("RESUMEN FINAL")
    print("="*60)
    print(f"Enviados: {enviados}")
    if salteados > 0:
        print(f"Salteados: {salteados}")
    print(f"Errores: {errores}")
    print(f"Log: {Config.LOGS_DIR}")
    print("="*60 + "\n")


# ============ FUNCIÓN 1: EXPENSAS MENSUALES ============
def preparar_datos_expensas():
    """Carga y prepara datos para envío de expensas"""
    df = pd.read_excel(Config.DATOS_MAESTRO)
    
    if Config.MODO_TEST:
        if Config.CANTIDAD_TEST is not None:
            df = df.head(Config.CANTIDAD_TEST)
        print(f"[TEST] MODO TEST: {len(df)} unidades")
        print(f"[TEST] TODOS LOS EMAILS SE ENVIARAN A: {Config.EMAIL_TEST}\n")
    else:
        print(f"[OK] {len(df)} unidades cargadas\n")
    
    return df


def mostrar_resumen_previo_expensas(df, mes_expensas):
    """Muestra resumen antes de enviar expensas"""
    print("\n" + "="*60)
    print("RESUMEN DE ENVIOS")
    print("="*60)
    print(f"\n{'N':<4} {'Depto':<12} {'Email Prop':<30} {'Email CC':<30} {'PDFs':<6}")
    print("-" * 82)

    limite = len(df) if Config.MODO_TEST else min(10, len(df))

    for _, row in df.head(limite).iterrows():
        n = row['N']
        depto = row['Depto']
        email_prop = row['Email_Propietario']
        email_inq = row.get('Email_Inquilino', '')

        pdf1_ok = "[OK]" if os.path.exists(f"{Config.PDFS_DIR}/Expensas {n}.pdf") else "[X]"
        pdf2_ok = "[OK]" if os.path.exists(f"{Config.PDFS_DIR}/Detalle expensas {n}.pdf") else "[X]"
        
        cc_display = procesar_email_cc(email_inq)
        if not cc_display:
            cc_display = "No tiene"
        elif len(cc_display) > 28:
            cc_display = cc_display[:28] + ".."
        
        print(f"{n:<4} {depto:<12} {email_prop:<30} {cc_display:<30} {pdf1_ok}{pdf2_ok:<6}")
    
    if len(df) > limite and not Config.MODO_TEST:
        print(f"\n... y {len(df)-limite} unidades más")
    
    print("\n" + "="*60)
    print("VISTA PREVIA DEL EMAIL")
    print("="*60)
    print(f"\nASUNTO: COMUNICACIONES - Liquidacion de Expensas {mes_expensas} - DEPTO [X]")
    print("\nCUERPO (extracto):\n")


def generar_asunto_expensa(tipo_unidad, depto, mes_expensas):
    """Genera asunto según tipo de unidad"""
    if tipo_unidad.upper() == 'COCHERA':
        num_cochera = depto.split()[-1] if 'COCHERA' in depto.upper() else depto
        asunto = f"COMUNICACIONES - Liquidación de Expensas {mes_expensas} - COCHERA {num_cochera}"
    else:
        asunto = f"COMUNICACIONES - Liquidación de Expensas {mes_expensas} - DEPTO {depto}"
    
    if Config.MODO_TEST:
        asunto = f"[TEST] {asunto}"
    
    return asunto


def enviar_expensas_mensuales():
    """Envia expensas mensuales a todas las unidades"""
    imprimir_header("ENVIO DE EXPENSAS MENSUALES", Config.MODO_TEST)

    # Cargar datos
    print("Cargando datos maestro...")
    df = preparar_datos_expensas()

    # Validar PDFs
    print("Validando PDFs...")
    faltantes = validar_pdfs(df['N'].tolist())

    if faltantes:
        print(f"\n[WARN] FALTAN {len(faltantes)} PDFs (primeros 5):")
        for pdf in faltantes[:5]:
            print(f"   - {pdf}")
        if len(faltantes) > 5:
            print(f"   ... y {len(faltantes)-5} mas")
        print("\n[WARN] Se saltearan las unidades con PDFs faltantes")
    else:
        print("[OK] Todos los PDFs encontrados\n")

    # Cargar plantillas
    plantilla = cargar_archivo_html('expensas')
    firma_html = cargar_archivo_html('firma', solo_body=True)

    if not plantilla or not firma_html:
        print("\n[ERROR] No se pueden enviar emails sin las plantillas HTML")
        return

    # Preparar variables
    mes_expensas = obtener_mes_expensas()
    print(f"Periodo: {mes_expensas}\n")
    
    # Mostrar resumen
    mostrar_resumen_previo_expensas(df, mes_expensas)
    plantilla_sample = combinar_plantilla_con_firma(
        plantilla.replace('{mes_expensas}', mes_expensas), firma_html
    )
    print(html_a_texto_simple(plantilla_sample))
    
    print("\n" + "="*60)
    print(f"TOTAL A ENVIAR: {len(df)} emails")
    if Config.MODO_TEST:
        print(f"[TEST] Todos se enviaran a {Config.EMAIL_TEST}")
    print("="*60 + "\n")

    if not confirmar_accion("CONFIRMAR ENVIO?"):
        print("[CANCEL] Envio cancelado")
        return

    # Autenticar
    print("\nAutenticando con Gmail...")
    service = autenticar_gmail()
    print("[OK] Autenticacion exitosa\n")

    # Enviar emails
    print("Enviando emails...\n")
    enviados = errores = salteados = 0
    
    for _, row in df.iterrows():
        n = row['N']
        depto = row['Depto']
        tipo_unidad = row['Tipo']
        email_prop = row['Email_Propietario']
        email_inq = row.get('Email_Inquilino', '')
        
        # Validar si hay al menos UN email
        tiene_email_prop = not (pd.isna(email_prop) or not email_prop or str(email_prop).strip() == '')
        tiene_email_inq = not (pd.isna(email_inq) or not email_inq or str(email_inq).strip() == '')

        if not tiene_email_prop and not tiene_email_inq:
            print(f"  [SKIP] {depto} - Sin email del propietario ni inquilino, SALTEADO")
            salteados += 1
            continue

        # Verificar PDFs
        if not pdfs_completos(n):
            print(f"  [SKIP] {depto} - PDFs incompletos, SALTEADO")
            salteados += 1
            continue
        
        # Determinar destinatario y CC
        if tiene_email_prop:
            # Caso normal: hay propietario
            email_destino = email_prop
            email_cc = procesar_email_cc(email_inq) if tiene_email_inq else None
            nota_envio = f"Prop: {email_destino}"
            if email_cc:
                nota_envio += f" (CC Inq: {email_cc})"
        else:
            # Caso especial: solo inquilino
            email_destino = email_inq
            email_cc = None
            nota_envio = f"Inq: {email_destino} (sin prop)"
        
        # Preparar email
        destinatario = Config.EMAIL_TEST if Config.MODO_TEST else email_destino
        cc_envio = Config.EMAIL_TEST if (Config.MODO_TEST and email_cc) else email_cc
        
        asunto = generar_asunto_expensa(tipo_unidad, depto, mes_expensas)
        cuerpo_html = combinar_plantilla_con_firma(
            plantilla.replace('{mes_expensas}', mes_expensas), firma_html
        )
        archivos = obtener_pdfs_unidad(n)
        
        # Enviar
        email_msg = crear_email(destinatario, asunto, cuerpo_html, archivos, cc=cc_envio)
        exito, resultado = enviar_email(service, email_msg)
        
        if exito:
            if Config.MODO_TEST:
                print(f"  [OK] {depto} - [{nota_envio}] -> {destinatario}", flush=True)
            else:
                print(f"  [OK] {depto} ({nota_envio})", flush=True)
            enviados += 1
            log_envio('expensas', email_destino, depto, True)

            # Si es modo test con limite de emails, verificar si debemos parar
            if Config.MODO_TEST and Config.TEST_EMAIL_COUNT > 0 and enviados >= Config.TEST_EMAIL_COUNT:
                print(f"\n[TEST] Limite alcanzado: {enviados}/{Config.TEST_EMAIL_COUNT} emails de prueba", flush=True)
                break
        else:
            print(f"  [ERROR] {depto} ({nota_envio}) - Error: {resultado}")
            errores += 1
            log_envio('expensas', email_destino, depto, False, resultado)

    imprimir_resumen_final(enviados, errores, salteados)

    return enviados, errores


# ============ FUNCIÓN 2: CORTE DE LUZ ============
def obtener_morosos():
    """Obtiene lista de morosos desde planilla de recaudación"""
    df_recaudacion = pd.read_excel(Config.EXCEL_RECAUDACION, sheet_name='② DETALLE RECAUDACION')
    
    col_nombre = df_recaudacion.columns[3]
    col_pago = df_recaudacion.columns[29]
    
    morosos = df_recaudacion[df_recaudacion[col_pago].isna() | (df_recaudacion[col_pago] == '')]
    return morosos[col_nombre].tolist()


def preparar_lista_envio_morosos(nombres_morosos):
    """Cruza morosos con datos maestro para obtener emails"""
    df_maestro = pd.read_excel(Config.DATOS_MAESTRO)
    lista_envio = []
    no_encontrados = []
    
    for nombre in nombres_morosos:
        nombre_upper = str(nombre).strip().upper()
        match = df_maestro[df_maestro['Nombre'].str.upper().str.strip() == nombre_upper]
        
        if len(match) > 0:
            lista_envio.append({
                'nombre': nombre_upper,
                'email_prop': match.iloc[0]['Email_Propietario'],
                'email_inq': match.iloc[0].get('Email_Inquilino', ''),
                'depto': match.iloc[0]['Depto']
            })
        else:
            no_encontrados.append(nombre)
    
    return lista_envio, no_encontrados


def enviar_avisos_corte_luz():
    """Envia avisos de corte de luz a morosos"""
    imprimir_header("ENVIO DE AVISOS DE CORTE DE LUZ")

    print("Cargando planilla de recaudacion...")
    nombres_morosos = obtener_morosos()
    print(f"[WARN] {len(nombres_morosos)} morosos detectados\n")

    if len(nombres_morosos) == 0:
        print("[OK] No hay morosos. Todos pagaron!")
        return

    lista_envio, no_encontrados = preparar_lista_envio_morosos(nombres_morosos)

    if no_encontrados:
        print(f"[WARN] No se encontro email para:")
        for n in no_encontrados:
            print(f"   - {n}")
        print()

    if len(lista_envio) == 0:
        print("[ERROR] No se pudo obtener ningun email")
        return

    # Cargar plantilla
    plantilla = cargar_archivo_html('corte_luz')
    firma_html = cargar_archivo_html('firma', solo_body=True)

    if not plantilla or not firma_html:
        print("\n[ERROR] No se pueden enviar emails sin las plantillas HTML")
        return

    fecha_corte = formatear_fecha_corte(dias_adelante=5)

    # Mostrar resumen
    print("="*60)
    print("AVISOS A ENVIAR")
    print("="*60)
    print(f"\n{'Depto':<12} {'Nombre':<25} {'Email':<30}")
    print("-" * 67)
    for item in lista_envio:
        print(f"{item['depto']:<12} {item['nombre']:<25} {item['email_prop']:<30}")

    print("\n" + "="*60)
    print(f"TOTAL: {len(lista_envio)} avisos")
    print(f"Fecha de corte: {fecha_corte}")
    print("="*60 + "\n")

    if not confirmar_accion("CONFIRMAR ENVIO?"):
        print("[CANCEL] Envio cancelado")
        return

    # Autenticar
    print("\nAutenticando con Gmail...")
    service = autenticar_gmail()
    print("[OK] Autenticacion exitosa\n")

    # Enviar avisos
    print("Enviando avisos...\n")
    enviados = errores = 0
    asunto = "AVISO FORMAL - Corte de suministro eléctrico programado"
    
    for item in lista_envio:
        cuerpo_html = combinar_plantilla_con_firma(
            plantilla.replace('{fecha_corte}', fecha_corte), firma_html
        )
        
        destinatario = Config.EMAIL_TEST if Config.MODO_TEST else item['email_prop']
        cc_real = procesar_email_cc(item['email_inq'])
        cc_envio = Config.EMAIL_TEST if (Config.MODO_TEST and cc_real) else cc_real
        
        email_msg = crear_email(destinatario, asunto, cuerpo_html, cc=cc_envio)
        exito, resultado = enviar_email(service, email_msg)
        
        if exito:
            cc_text = f" (CC: {cc_real})" if cc_real else ""
            if Config.MODO_TEST:
                print(f"  [OK] {item['depto']} - [{item['email_prop']}] -> {destinatario}{cc_text}")
            else:
                print(f"  [OK] {item['depto']} ({destinatario}){cc_text}")
            enviados += 1
            log_envio('corte_luz', item['email_prop'], item['depto'], True)
        else:
            print(f"  [ERROR] {item['depto']} ({item['email_prop']}) - Error: {resultado}")
            errores += 1
            log_envio('corte_luz', item['email_prop'], item['depto'], False, resultado)
    
    imprimir_resumen_final(enviados, errores)

    return enviados, errores


# ============ FUNCION 3: AVISOS GENERALES ============
def enviar_avisos_generales(asunto=None):
    """Envia avisos generales personalizables"""
    imprimir_header("ENVIO DE AVISOS GENERALES")

    plantilla = cargar_archivo_html('aviso_general')
    firma_html = cargar_archivo_html('firma', solo_body=True)

    if not plantilla or not firma_html:
        print("\n[ERROR] No se pueden enviar emails sin las plantillas HTML")
        return 0, 0

    if asunto is None:
        asunto = input("Asunto del email: ")

    df = pd.read_excel(Config.DATOS_MAESTRO)
    print(f"\n[OK] Se enviara a {len(df)} unidades")

    print("\n" + "="*60)
    print("VISTA PREVIA DEL MENSAJE")
    print("="*60)
    print(f"\nAsunto: {asunto}\n")
    print(plantilla[:300] + "..." if len(plantilla) > 300 else plantilla)
    print("\n" + "="*60 + "\n")

    if not confirmar_accion("CONFIRMAR ENVIO?"):
        print("[CANCEL] Envio cancelado")
        return

    print("\nAutenticando con Gmail...")
    service = autenticar_gmail()
    print("[OK] Autenticacion exitosa\n")

    print("Enviando...\n")
    enviados = errores = 0
    
    for _, row in df.iterrows():
        cuerpo_html = combinar_plantilla_con_firma(
            plantilla.replace('{nombre}', row['Nombre']).replace('{depto}', row['Depto']),
            firma_html
        )
        
        destinatario = Config.EMAIL_TEST if Config.MODO_TEST else row['Email_Propietario']
        cc_real = procesar_email_cc(row.get('Email_Inquilino', ''))
        cc_envio = Config.EMAIL_TEST if (Config.MODO_TEST and cc_real) else cc_real
        
        email_msg = crear_email(destinatario, asunto, cuerpo_html, cc=cc_envio)
        exito, resultado = enviar_email(service, email_msg)
        
        if exito:
            cc_text = f" (CC: {cc_real})" if cc_real else ""
            if Config.MODO_TEST:
                print(f"  [OK] {row['Depto']} - [{row['Email_Propietario']}] -> {destinatario}{cc_text}")
            else:
                print(f"  [OK] {row['Depto']} ({destinatario}){cc_text}")
            enviados += 1
            log_envio('aviso_general', row['Email_Propietario'], row['Depto'], True)
        else:
            print(f"  [ERROR] {row['Depto']} ({row['Email_Propietario']}) - Error: {resultado}")
            errores += 1
            log_envio('aviso_general', row['Email_Propietario'], row['Depto'], False, resultado)
    
    imprimir_resumen_final(enviados, errores)

    return enviados, errores


# ============ MENU PRINCIPAL ============
def menu_principal():
    """Menu principal del sistema"""
    while True:
        print("\n" + "="*60)
        print("SISTEMA DE ENVIO DE EXPENSAS")
        if Config.MODO_TEST:
            print(f"[TEST] MODO TEST ACTIVADO - Email: {Config.EMAIL_TEST}")
        print("="*60)
        print("\n1) Enviar expensas mensuales (con PDFs)")
        print("2) Enviar avisos de corte de luz")
        print("3) Enviar avisos generales")
        print("4) Salir")
        print("\n" + "="*60)

        opcion = input("\nElegi una opcion: ")

        if opcion == '1':
            enviar_expensas_mensuales()
        elif opcion == '2':
            enviar_avisos_corte_luz()
        elif opcion == '3':
            enviar_avisos_generales()
        elif opcion == '4':
            print("\nChau!")
            break
        else:
            print("\n[ERROR] Opcion invalida")


# ============ CLI PARA WEB ============
def main():
    """Punto de entrada con soporte para CLI"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Sistema de envío de expensas')
    parser.add_argument('--action', choices=['expensas', 'corte_luz', 'avisos_generales'])
    parser.add_argument('--test-mode', default='false')
    parser.add_argument('--test-email', default='')
    parser.add_argument('--data-file')
    parser.add_argument('--pdf-folder', default='')
    parser.add_argument('--plantillas-dir', default='')
    parser.add_argument('--dias-corte', type=int, default=5)
    parser.add_argument('--subject', default='')
    parser.add_argument('--no-confirm', action='store_true')
    parser.add_argument('--test-email-count', type=int, default=0, help='Limite de emails en modo test (0=todos)')
    parser.add_argument('--building-config', default='', help='JSON con config del edificio')

    args = parser.parse_args()

    # Cargar config del edificio si se paso
    if args.building_config:
        try:
            building_config = json.loads(args.building_config)
            Config.load_from_building(building_config)
            print(f"Edificio: {Config.NOMBRE_REMITENTE}", flush=True)
        except json.JSONDecodeError as e:
            print(f"[WARN] Error parseando building-config: {e}", flush=True)

    # Si no hay argumentos, mostrar menu
    if not args.action:
        menu_principal()
        return
    
    # Configurar
    Config.MODO_TEST = args.test_mode.lower() == 'true'
    Config.AUTO_CONFIRM = args.no_confirm
    
    if Config.MODO_TEST and args.test_email:
        Config.EMAIL_TEST = args.test_email

    Config.TEST_EMAIL_COUNT = args.test_email_count

    if args.data_file:
        Config.DATOS_MAESTRO = args.data_file
    
    if args.pdf_folder:
        Config.PDFS_DIR = args.pdf_folder

    if args.plantillas_dir:
        Config.PLANTILLAS_DIR = args.plantillas_dir
    
    print(f"Iniciando {args.action}...", flush=True)
    print(f"Excel: {Config.DATOS_MAESTRO}", flush=True)
    print(f"PDFs: {Config.PDFS_DIR}", flush=True)
    print(f"Test mode: {Config.MODO_TEST}", flush=True)

    # Ejecutar
    try:
        if args.action == 'expensas':
            enviados, errores = enviar_expensas_mensuales()
        elif args.action == 'corte_luz':
            enviados, errores = enviar_avisos_corte_luz()
        elif args.action == 'avisos_generales':
            enviados, errores = enviar_avisos_generales(asunto=args.subject)

        print(f"\n[DONE] COMPLETADO", flush=True)
        print(f"Enviados: {enviados}", flush=True)
        print(f"Errores: {errores}", flush=True)

    except Exception as e:
        print(f"\n[ERROR] {str(e)}", flush=True)
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()