from sqlalchemy import Column, String, Float, Integer, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime
import uuid
from backend.db.database import Base

class DocumentModel(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    status = Column(String, nullable=False) # Uyumlu, Kısmen Uyumlu, Uyumsuz
    article_count = Column(Integer, default=0)
    non_compliant_articles = Column(JSON, default=list) # List of article titles
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)

    articles = relationship("ArticleModel", back_populates="document", cascade="all, delete-orphan")

class ArticleModel(Base):
    __tablename__ = "articles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id"))
    number = Column(String)
    title = Column(String)
    status = Column(String) # Uyumlu, Kısmen Uyumlu, Uyumsuz
    similarity = Column(Float)
    text = Column(Text)
    yok_reference = Column(String)
    yok_text = Column(Text)
    reasoning = Column(JSON, default=list) # List of strings
    suggestion = Column(Text)

    document = relationship("DocumentModel", back_populates="articles")
