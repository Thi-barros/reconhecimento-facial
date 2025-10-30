import os
from sqlalchemy import create_engine, Column, Integer, String, LargeBinary, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone
import enum


#Enums para níveis de acesso
class AccessLevel(enum.Enum):
    BASICO = "BASICO"
    INTERMEDIARIO = "INTERMEDIARIO"
    TOTAL = "TOTAL"

class DocumentLevel(enum.Enum):
    LIVRE = "LIVRE"
    RESTRITO = "RESTRITO"
    CONFIDENCIAL = "CONFIDENCIAL"



#Configuração do banco de dados SQLite
DATABASE_URL = "sqlite:///./data/access_control.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class AuthorizedUser(Base):
    __tablename__ = "authorized_users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    face_encoding = Column(Text) # armazenar como string para simplificar
    image_path = Column(String)
    access_level = Column(String, default=AccessLevel.BASICO.value)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)  # 1 para ativo, 0 para inativo


    #Relacionamento com documentos enviados
    documents = relationship("Document", back_populates="uploader")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    filename = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    document_level = Column(String, default=DocumentLevel.LIVRE.value)
    file_path = Column(String)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    uploaded_by = Column(Integer, ForeignKey("authorized_users.id"))  # ID do usuário que enviou o documento

    #Relacionamento com o usuário que enviou
    uploader = relationship("AuthorizedUser", back_populates="documents")

class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=True)  # Nome do usuário autorizado, se aplicável
    user_id = Column(Integer, ForeignKey("authorized_users.id"), nullable=True)  # ID do usuário autorizado, se aplicável
    access_granted = Column(Boolean)  # True para acesso concedido, False para negado
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    confidence_score = Column(Integer, nullable=True)  # Pontuação de confiança do reconhecimento facial
    image_path = Column(String, nullable=True)  # Caminho para a imagem capturada durante o acesso
    access_type = Column(String, default="facial_recognition")  # Tipo de acesso (ex: RECONHECIMENTO_FACIAL, CARTAO_ACESSO, etc.)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)  # ID do documento acessado, se aplicável

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    if not os.path.exists('./data'):
        os.makedirs('./data')
    Base.metadata.create_all(bind=engine)

def get_accessible_documents(user_access_level: AccessLevel):

    if user_access_level == AccessLevel.BASICO:
        return [DocumentLevel.LIVRE.value]
    elif user_access_level == AccessLevel.INTERMEDIARIO:
        return [DocumentLevel.LIVRE.value, DocumentLevel.RESTRITO.value]
    elif user_access_level == AccessLevel.TOTAL:
        return [DocumentLevel.LIVRE.value, DocumentLevel.RESTRITO.value, DocumentLevel.CONFIDENCIAL.value]
    else:
        return []
