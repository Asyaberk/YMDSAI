from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ArticleSchema(BaseModel):
    id: str
    number: str
    title: str
    status: str
    similarity: float
    text: str
    yokReference: str = Field(alias="yok_reference")
    yokText: str = Field(alias="yok_text")
    reasoning: List[str]
    suggestion: str

    class Config:
        from_attributes = True
        populate_by_name = True

class DocumentSchema(BaseModel):
    id: str
    name: str
    category: str
    status: str
    articleCount: int = Field(alias="article_count")
    nonCompliantArticles: List[str] = Field(alias="non_compliant_articles")
    uploadDate: datetime = Field(alias="upload_date")

    class Config:
        from_attributes = True
        populate_by_name = True

class CategoryScoreSchema(BaseModel):
    name: str
    score: float

class TrendDataSchema(BaseModel):
    month: str
    uyumlu: int
    kismen: int
    uyumsuz: int
