from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_HOST: str = "db"
    DB_USERNAME: str = "asya"
    DB_PASSWORD: str = "Asya1234"
    DB_PORT: int = 5432
    DB_DATABASE: str = "dbcomplianceai"
    OPENAI_API_KEY: str = ""
    JWT_SECRET_KEY: str = "complianceai-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USERNAME}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
