import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Configuración de Base de Datos
    DATABASE_URL: str
    
    # Integración con Microservicios Externos (URLs)
    SCORING_SERVICE_URL: str
    OPERATIONS_SERVICE_URL: str
    
    # Seguridad y Firma Digital (Superintendencia)
    SECRET_KEY_PROD: str
    ENVIRONMENT: str = "development"

    # Configuración de Pydantic para mapear el archivo .env
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignora otras variables del sistema operativo
    )

# Instancia global para ser importada en todo el proyecto
settings = Settings()