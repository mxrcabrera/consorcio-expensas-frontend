"""
Wrapper CLI para el sistema de expensas
"""
import sys
import argparse
import os

# CRÍTICO: Forzar unbuffered output para streaming en tiempo real
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Fix encoding para Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Obtener directorio del proyecto
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# Importar el script original
import expensas

def main():
    parser = argparse.ArgumentParser(description='Sistema de Envío de Expensas')
    parser.add_argument('--action', required=True, choices=['expensas', 'corte_luz', 'avisos_generales'])
    parser.add_argument('--test-mode', required=True, type=lambda x: x.lower() == 'true')
    parser.add_argument('--test-email', default='')
    parser.add_argument('--data-file', required=True)
    parser.add_argument('--pdf-folder', default='')
    parser.add_argument('--dias-corte', type=int, default=5)
    parser.add_argument('--subject', default='')
    parser.add_argument('--no-confirm', action='store_true', help='Skip confirmation prompts')
    
    args = parser.parse_args()
    
    # Actualizar configuración con rutas relativas al proyecto
    expensas.Config.MODO_TEST = args.test_mode
    
    if args.test_email:
        expensas.Config.EMAIL_TEST = args.test_email
    
    if args.data_file:
        expensas.Config.DATOS_MAESTRO = args.data_file
    
    if args.pdf_folder:
        expensas.Config.PDFS_DIR = args.pdf_folder
    
    # Configurar archivos de autenticación en la raíz del proyecto
    expensas.Config.TOKEN_FILE = os.path.join(PROJECT_ROOT, 'token.pickle')
    expensas.Config.CREDENTIALS_FILE = os.path.join(PROJECT_ROOT, 'credentials.json')
    
    # Crear carpeta de logs en el proyecto si no existe
    logs_dir = os.path.join(PROJECT_ROOT, 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    expensas.Config.LOGS_DIR = logs_dir
    
    # Configurar carpeta de plantillas en el proyecto
    templates_dir = os.path.join(PROJECT_ROOT, 'templates')
    os.makedirs(templates_dir, exist_ok=True)
    expensas.Config.PLANTILLAS_DIR = templates_dir
    
    # Auto-confirmar si se pasa el flag
    if args.no_confirm:
        def auto_confirmar(mensaje="¿CONFIRMAR?"):
            print(f"{mensaje} -> AUTO-CONFIRMADO")
            return True
        expensas.confirmar_accion = auto_confirmar
    
    try:
        enviados = errores = 0
        
        if args.action == 'expensas':
            enviados, errores = expensas.enviar_expensas_mensuales()
            
        elif args.action == 'corte_luz':
            enviados, errores = expensas.enviar_avisos_corte_luz()
            
        elif args.action == 'avisos_generales':
            if not args.subject:
                print("ERROR: Asunto requerido para avisos generales", file=sys.stderr)
                sys.exit(1)
            # Pasar el asunto como parámetro
            enviados, errores = expensas.enviar_avisos_generales(args.subject)
        
        # Formato de salida para el API
        print(f"SUCCESS:sent={enviados}:errors={errores}")
        sys.exit(0)
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()