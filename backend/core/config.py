from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_HOST: str = "127.0.0.1"
    DB_USERNAME: str = "asya"
    DB_PASSWORD: str = "Asya1234"
    DB_PORT: int = 5433
    DB_DATABASE: str = "dbcomplianceai"
    OPENAI_API_KEY: str

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USERNAME}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
