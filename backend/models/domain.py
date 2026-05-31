from sqlalchemy import Column, String, Float, Integer, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime
import uuid
from backend.db.database import Base


class UserModel(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name          = Column(String, nullable=False)
    email         = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    role          = Column(String, nullable=False, default="USER")   # USER | ADMIN
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)

    documents     = relationship("DocumentModel", back_populates="user")
    chat_messages = relationship("ChatMessageModel", back_populates="user")


class DocumentModel(Base):
    __tablename__ = "documents"

    id                      = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name                    = Column(String, nullable=False)
    category                = Column(String, nullable=False, default="Genel")
    status                  = Column(String, nullable=False)           # Uyumlu | Kısmen Uyumlu | Uyumsuz
    compliance_score        = Column(Integer, default=0)
    article_count           = Column(Integer, default=0)
    non_compliant_articles  = Column(JSON, default=list)
    pipeline                = Column(String, default="hybrid")
    model                   = Column(String, default="gpt-4o-mini")
    upload_date             = Column(DateTime, default=datetime.datetime.utcnow)
    user_id                 = Column(String, ForeignKey("users.id"), nullable=True)

    user     = relationship("UserModel", back_populates="documents")
    articles = relationship("ArticleModel", back_populates="document", cascade="all, delete-orphan")


class ArticleModel(Base):
    __tablename__ = "articles"

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id  = Column(String, ForeignKey("documents.id"))
    number       = Column(String)
    title        = Column(String)
    status       = Column(String)
    similarity   = Column(Float)
    text         = Column(Text)
    yok_reference = Column(String)
    yok_text     = Column(Text)
    reasoning    = Column(JSON, default=list)
    suggestion   = Column(Text)

    document = relationship("DocumentModel", back_populates="articles")


class YokDocumentModel(Base):
    __tablename__ = "yok_documents"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title       = Column(String, nullable=False)
    filename    = Column(String, nullable=False)
    version     = Column(String, default="1.0")
    status      = Column(String, default="Aktif")   # Aktif | Taslak
    last_update = Column(DateTime, default=datetime.datetime.utcnow)


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"), nullable=True)
    question   = Column(Text, nullable=False)
    answer     = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("UserModel", back_populates="chat_messages")
