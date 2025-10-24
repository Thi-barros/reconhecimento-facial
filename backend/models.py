from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    is_active: bool

    class Config:
        from_atribute = True

class AccessAttempt(BaseModel):
    timestamp: datetime
    access_granted: bool
    user_name: Optional[str] = None
    confidence_score: Optional[str] = None

class AccessResponse(BaseModel):
    access_granted: bool
    user_name: Optional[str] = None
    message: str
    confidence_score: Optional[str] = None