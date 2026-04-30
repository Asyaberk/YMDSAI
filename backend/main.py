from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.database import engine, Base
from backend.api import routes

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ComplianceAI Backend",
    description="Backend for the YÖK Compliance Checker Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok"}
