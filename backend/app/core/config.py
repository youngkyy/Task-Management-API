import os

class Settings:
    PROJECT_NAME: str = "Task Management API"
    API_V1_STR: str = "/api/v1"
    
    # JWT security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "7b689a05f3922d56d81a02bd365a657e23118cf6258f3be2931a7428f6e2b12f")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for dev convenience

    # Database configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./task_management.db")

settings = Settings()

