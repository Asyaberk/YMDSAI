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
    role          = Column(String, nullable=False, default="USER")
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)

    documents     = relationship("DocumentModel", back_populates="user")
    chat_messages = relationship("ChatMessageModel", back_populates="user")


class DocumentModel(Base):
    __tablename__ = "documents"

    id                      = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name                    = Column(String, nullable=False)
    category                = Column(String, nullable=False, default="Genel")
    status                  = Column(String, nullable=False)
    compliance_score        = Column(Integer, default=0)
    article_count           = Column(Integer, default=0)
    non_compliant_articles  = Column(JSON, default=list)
    pipeline                = Column(String, default="hybrid")
    model                   = Column(String, default="gpt-4o-mini")
    upload_date             = Column(DateTime, default=datetime.datetime.utcnow)
    user_id                 = Column(String, ForeignKey("users.id"), nullable=True)
    # New columns (added via ALTER TABLE in main.py startup)
    full_text               = Column(Text, nullable=True)
    retrieved_chunks_json   = Column(Text, nullable=True)  # JSON string

    user     = relationship("UserModel", back_populates="documents")
    articles = relationship("ArticleModel", back_populates="document", cascade="all, delete-orphan")

    @property
    def retrieved_chunks_json_parsed(self):
        """Parse stored JSON string for schema serialization."""
        if self.retrieved_chunks_json:
            import json
            try:
                return json.loads(self.retrieved_chunks_json)
            except Exception:
                return []
        return []


class ArticleModel(Base):
    __tablename__ = "articles"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id   = Column(String, ForeignKey("documents.id"))
    number        = Column(String, default="")
    title         = Column(String, default="")
    status        = Column(String, default="Kısmen Uyumlu")
    similarity    = Column(Float, default=0.5)
    text          = Column(Text, default="")
    yok_reference = Column(String, default="")
    yok_text      = Column(Text, default="")
    reasoning     = Column(JSON, default=list)
    suggestion    = Column(Text, default="")

    document = relationship("DocumentModel", back_populates="articles")


class YokDocumentModel(Base):
    __tablename__ = "yok_documents"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title       = Column(String, nullable=False)
    filename    = Column(String, nullable=False)
    version     = Column(String, default="1.0")
    status      = Column(String, default="Aktif")
    last_update = Column(DateTime, default=datetime.datetime.utcnow)


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"), nullable=True)
    session_id = Column(String, nullable=True)   # groups messages into conversations
    question   = Column(Text, nullable=False)
    answer     = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("UserModel", back_populates="chat_messages")
