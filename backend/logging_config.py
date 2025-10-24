import logging
import os 
from datetime import datetime
from logging.handlers import RotatingFileHandler

def setup_logging():
    #Cria diretório de logs se não existir
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    #configurar formato de log
    log_format = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    #Log principal da aplicação
    main_handler = RotatingFileHandler(
        os.path.join(log_dir, 'access_control.log'), 
        maxBytes=5*1024*1024, 
        backupCount=5)
    main_handler.setLevel(logging.INFO)
    main_handler.setFormatter(log_format)


    # Log especifico para tentativas de acesso
    access_handler = RotatingFileHandler(
        os.path.join(log_dir, 'access_attempts.log'), 
        maxBytes=5*1024*1024, 
        backupCount=10)
    access_handler.setLevel(logging.INFO)
    access_handler.setFormatter(log_format)

    #Log especidifico para erros de sistema
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'error.log'), 
        maxBytes=5*1024*1024, 
        backupCount=10)
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(log_format)


    # Configuração do logger principal
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(main_handler)
    logger.addHandler(access_handler)

    #Logger especifico para tentativas de acesso
    access_logger = logging.getLogger("access_attemps")
    access_logger.setLevel(logging.INFO)
    access_logger.addHandler(access_handler)

    #Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)

    return logger, access_logger

class AccessLogger:

    def __init__(self, access_logger):
        self.access_logger = access_logger

    def log_access_attempt(self, user_name: str = None, access_granted: bool = False, 
                           confidence: float = 0.0, method: str = "camera"):
        #Registra tentativas de acesso

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        status = "GRANTED" if success else "DENIED"
        
        if access_granted and user_name:
            message = (f"{timestamp} - Access {status} for user '{user_name}' "
                       f"with confidence {confidence:.2f} via {method}.")
        else:
            message = (f"{timestamp} - Access {status} for unknown user "
                       f"with confidence {confidence:.2f} via {method}.")
            
        if access_granted:
            self.access_logger.info(message)
        else:
            self.access_logger.warning(message)

    def log_user_registration(self, user_name: str, email: str, success: bool):
        status = "SUCCESS" if success else "FAILURE"
        message = f"User registration {status} for '{user_name}' with email '{email}'."
        if success:
            self.access_logger.info(message)
        else:
            self.access_logger.error(message)

    def log_user_removal(self, user_name: str, email: str, success: bool):
        status = "SUCCESS" if success else "FAILURE"
        message = f"User removal {status} for '{user_name}' with email '{email}'."
        if success:
            self.access_logger.info(message)
        else:
            self.access_logger.error(message)

    def log_system_event(self, event: str, details: str = ""):
        message = f"System event: {event}. Details: {details}"
        self.access_logger.info(message)


    def log_error(self, error_type: str, error_message: str):
        message = f"Error [{error_type}]: {error_message}"
        self.access_logger.error(message)
