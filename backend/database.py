import os
from sqlalchemy import create_engine, Column, Integer, String, LargeBinary, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

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
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)  # 1 para ativo, 0 para inativo

class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=True)  # Nome do usuário autorizado, se aplicável
    access_granted = Column(Boolean)  # True para acesso concedido, False para negado
    timestamp = Column(DateTime, default=datetime.utcnow)
    confidence_score = Column(Integer, nullable=True)  # Pontuação de confiança do reconhecimento facial
    image_path = Column(String, nullable=True)  # Caminho para a imagem capturada durante o acesso
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