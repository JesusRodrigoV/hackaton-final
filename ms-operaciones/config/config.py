from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    ENV: str = "development"
    DEBUG: bool = True
    DATABASE_URL: str
    SECRET_KEY: str = "changeme_change_this_in_prod"
    LOG_LEVEL: str = "INFO"
    SENTRY_DSN: str = ""
    REDIS_URL: str = "redis://redis:6379/0"
    MAIL_HOST: str = "smtp.example.com"
    MAIL_PORT: int = 587
    MAIL_USER: str = "mailer@example.com"
    MAIL_PASS: str = "supersecret"
    MAIL_FROM: str = "neolend@example.com"
    API_RATE_LIMIT: str = "100/min"


settings = Settings()


__all__ = ("settings", "Settings")
