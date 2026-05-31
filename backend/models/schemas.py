from pydantic import BaseModel, Field
from pydantic import ConfigDict
from typing import List, Optional
from datetime import datetime


class ArticleSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    number: str
    title: str
    status: str
    similarity: float
    text: str
    yokReference: str = Field(validation_alias="yok_reference")
    yokText: str = Field(validation_alias="yok_text")
    reasoning: List[str]
    suggestion: str


class DocumentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    category: str
    status: str
    complianceScore: int      = Field(validation_alias="compliance_score", default=0)
    articleCount: int         = Field(validation_alias="article_count", default=0)
    nonCompliantArticles: List[str] = Field(validation_alias="non_compliant_articles", default_factory=list)
    uploadDate: datetime      = Field(validation_alias="upload_date")
    pipeline: Optional[str]   = None
    model: Optional[str]      = None


class DocumentDetailSchema(DocumentSchema):
    articles: List[ArticleSchema] = []
    fullText: Optional[str]   = Field(validation_alias="full_text", default=None)
    retrievedChunks: Optional[List[dict]] = Field(validation_alias="retrieved_chunks_json_parsed", default=None)
