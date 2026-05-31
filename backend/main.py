from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.database import engine, Base
from backend.api import routes
from backend.api import auth as auth_router

# Create all DB tables (including new ones: users, yok_documents, chat_messages)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ComplianceAI Backend",
    description="YÖK Mevzuat Uyum Denetim Platformu API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api")
app.include_router(routes.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ComplianceAI"}
