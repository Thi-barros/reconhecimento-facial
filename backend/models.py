from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum

class AccessLevel(str, Enum):
    BASICO = "BASICO"
    INTERMEDIARIO = "INTERMEDIARIO"
    TOTAL = "TOTAL"


class DocumentLevel(str, Enum):
    LIVRE = "LIVRE"
    RESTRITO = "RESTRITO"
    CONFIDENCIAL = "CONFIDENCIAL"


class UserCreate(BaseModel):
    name: str
    email: str
    access_level: AccessLevel = AccessLevel.BASICO

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    access_level: AccessLevel
    created_at: datetime
    is_active: bool

    class Config:
        from_atribute = True
        #orm_mode = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    #email: Optional[str] = None
    access_level: Optional[AccessLevel] = None
    is_active: Optional[bool] = None

class DocumentCreate(BaseModel):
    title: str
    filename: str
    description: Optional[str] = None
    document_level: DocumentLevel = DocumentLevel.LIVRE


class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: Optional[str] = None
    description: Optional[str] = None
    document_level: DocumentLevel
    file_path: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    uploaded_by: Optional[int] = None

    class Config:
        from_attributes = True


class AccessAttempt(BaseModel):
    timestamp: datetime
    access_granted: bool
    user_name: Optional[str] = None
    confidence_score: Optional[str] = None

class AccessResponse(BaseModel):
    access_granted: bool
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    message: str
    confidence_score: Optional[str] = None
    access_level: Optional[AccessLevel] = None
    locked: Optional[bool] = False
    lock_remaining_seconds: Optional[int] = None


class DocumentAccessResponse(BaseModel):
    documents: List[DocumentResponse]
    user_acess_level: AccessLevel
    total_available: int

    class Config:
        orm_mode= True