from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from backend.db.database import engine, Base
from backend.api import routes
from backend.api import auth as auth_router

# Create all DB tables
Base.metadata.create_all(bind=engine)

# Add new columns if they don't exist (zero-downtime migration)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS full_text TEXT"))
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS retrieved_chunks_json TEXT"))
        conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id TEXT"))
        conn.commit()
    except Exception as e:
        print(f"[Migration] Skipped (already exists): {e}")

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
