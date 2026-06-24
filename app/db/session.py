from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 1. Crear el motor de conexión (Engine)
# 'pool_pre_ping=True' ayuda a detectar y reconectar automáticamente si la BD se cae
engine = create_engine(
    settings.DATABASE_URL, 
    pool_pre_ping=True
)

# 2. Configurar la fábrica de sesiones (SessionLocal)
# Cada llamada a SessionLocal() generará una sesión de base de datos única
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

# 3. Dependencia de FastAPI para inyectar la sesión en los Endpoints
# Se encarga de abrir la conexión y cerrarla estrictamente cuando termine la petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()