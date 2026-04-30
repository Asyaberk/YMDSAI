from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
from backend.db.database import get_db
from backend.models import schemas, domain
from backend.services.document_parser import parse_pdf
from backend.services.rag_service import rag_service

router = APIRouter()

@router.post("/analyze", response_model=schemas.DocumentSchema)
async def analyze_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    chunks = parse_pdf(contents)

    full_text = " ".join(chunks)
    
    # Run RAG Analysis for this document
    analysis_results = rag_service.analyze_document(full_text, file.filename)
    
    doc_model = domain.DocumentModel(
        name=file.filename,
        category="Genel",
        status=analysis_results["status"],
        article_count=len(analysis_results["articles"]),
        non_compliant_articles=[a["title"] for a in analysis_results["articles"] if a["status"] == "Uyumsuz"]
    )
    db.add(doc_model)
    db.commit()
    db.refresh(doc_model)

    for art in analysis_results["articles"]:
        art_model = domain.ArticleModel(
            document_id=doc_model.id,
            number=art["number"],
            title=art["title"],
            status=art["status"],
            similarity=art["similarity"],
            text=art["text"],
            yok_reference=art["yok_reference"],
            yok_text=art["yok_text"],
            reasoning=art["reasoning"],
            suggestion=art["suggestion"]
        )
        db.add(art_model)
    
    db.commit()
    db.refresh(doc_model)
    
    return doc_model

@router.get("/documents", response_model=List[schemas.DocumentSchema])
def get_documents(db: Session = Depends(get_db)):
    return db.query(domain.DocumentModel).all()

@router.get("/dashboard/metrics")
def get_metrics(db: Session = Depends(get_db)):
    return {
        "trendData": [
            {"month": "Ocak", "uyumlu": 10, "kismen": 2, "uyumsuz": 1},
            {"month": "Şubat", "uyumlu": 15, "kismen": 3, "uyumsuz": 2}
        ],
        "categoryScores": [
            {"name": "Genel", "score": 85}
        ]
    }

@router.get("/experiments")
def get_experiments():
    try:
        df = pd.read_csv("experiment_outputs/summary_clean.csv")
        return {"rows": df.to_dict(orient="records")}
    except Exception:
        return {"rows": []}
