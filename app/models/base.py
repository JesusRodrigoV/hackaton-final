from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """
    Clase base declarativa para todos los modelos de SQLAlchemy 2.0.
    Actúa como el registro central de metadatos para Alembic.
    """
    pass