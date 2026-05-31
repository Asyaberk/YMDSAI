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
    complianceScore: int = Field(alias="compliance_score", default=0)
    articleCount: int = Field(alias="article_count")
    nonCompliantArticles: List[str] = Field(alias="non_compliant_articles")
    uploadDate: datetime = Field(alias="upload_date")
    pipeline: Optional[str] = None
    model: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class DocumentDetailSchema(DocumentSchema):
    articles: List[ArticleSchema] = []

    class Config:
        from_attributes = True
        populate_by_name = True
