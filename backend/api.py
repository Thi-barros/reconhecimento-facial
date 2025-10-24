from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
import cv2
import numpy as np
import base64
import io
import os
from datetime import datetime
from typing import List, Optional
import logging
from database import get_db, init_database, AuthorizedUser, AccessLog
from models import UserCreate, UserResponse, AccessResponse
from face_recognition_module import FaceRecognitionSystem


# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Inicializar FastAPI
app = FastAPI(title="Sistema de Controle de Acesso Facial", version="1.0.0", root_path="/api")


# Configurar CORS para permitir acesso do frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar sistema de reconhecimento facial
face_system = FaceRecognitionSystem()


@app.on_event("startup")
async def startup_event():
    """Inicializar banco de dados ao iniciar a aplicação"""
    init_database()
    logger.info("Sistema de controle de acesso iniciado")


@app.get("/")
async def root():
    """Endpoint raiz da API"""
    return {"message": "Sistema de Controle de Acesso Facial", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Verificação de saúde da API"""
    return {"status": "healthy", "timestamp": datetime.now()}


@app.post("/users/register", response_model=UserResponse)
async def register_user(
    name: str = Form(...),
    email: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Registrar um novo usuário autorizado com sua foto"""
    try:
        # Verificar se o usuário já existe
        existing_user = db.query(AuthorizedUser).filter(AuthorizedUser.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Usuário já registrado")

        # Validar formato da imagem
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Arquivo deve ser uma imagem")

        # Salvar imagem temporariamente
        image_content = await image.read()
        temp_image_path = f"data/authorized_faces/temp_{email}_{datetime.now().timestamp()}.jpg"

        with open(temp_image_path, "wb") as f:
            f.write(image_content)

        # Registrar face no sistema
        success, message, encoding_str = face_system.register_face(temp_image_path, name, email)

        if not success:
            # Remover imagem temporária em caso de erro
            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)
            raise HTTPException(status_code=400, detail=message)

        # Salvar no banco de dados
        final_image_path = f"data/authorized_faces/{email}_{datetime.now().timestamp()}.jpg"
        os.rename(temp_image_path, final_image_path)

        db_user = AuthorizedUser(
            name=name,
            email=email,
            face_encoding=encoding_str,
            image_path=final_image_path
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        logger.info(f"Usuário registrado: {name} ({email})")
        return db_user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao registrar usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.get("/users", response_model=List[UserResponse])
async def get_users(db: Session = Depends(get_db)):
    """Listar todos os usuários autorizados"""
    users = db.query(AuthorizedUser).filter(AuthorizedUser.is_active == True).all()
    return users


@app.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Remover um usuário autorizado"""
    try:
        user = db.query(AuthorizedUser).filter(AuthorizedUser.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        # Remover do sistema de reconhecimento
        face_system.remove_authorized_face(user.email)

        # Marcar como inativo no banco
        user.is_active = False
        db.commit()

        # Remover arquivos
        if user.image_path and os.path.exists(user.image_path):
            os.remove(user.image_path)

        logger.info(f"Usuário removido: {user.name} ({user.email})")
        return {"message": "Usuário removido com sucesso"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.post("/access/check", response_model=AccessResponse)
async def check_access(image: UploadFile = File(...), db: Session = Depends(get_db)):
    """Verificar acesso baseado na imagem da câmera"""
    try:
        # Validar imagem
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Arquivo deve ser uma imagem")

        # Processar imagem
        image_content = await image.read()
        nparr = np.frombuffer(image_content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Imagem inválida")

        # Reconhecer face
        access_granted, user_name, confidence = face_system.recognize_face(img)

        # Registrar log de acesso
        access_log = AccessLog(
            user_name=user_name,
            access_granted=access_granted,
            confidence_score=f"{confidence:.1f}%" if confidence > 0 else None
        )

        db.add(access_log)
        db.commit()

        # Preparar resposta
        if access_granted:
            message = f"Acesso liberado para {user_name}"
            logger.info(f"Acesso liberado: {user_name} (confiança: {confidence:.1f}%)")
        else:
            message = "Acesso negado - Pessoa não autorizada"
            logger.warning("Acesso negado - Pessoa não autorizada")

        return AccessResponse(
            access_granted=access_granted,
            user_name=user_name,
            message=message,
            confidence_score=f"{confidence:.1f}%" if confidence > 0 else None

        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na verificação de acesso: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.post("/access/check-camera")
async def check_access_camera(db: Session = Depends(get_db)):
    """Verificar acesso usando câmera do sistema"""
    try:
        # Capturar frame da câmera
        frame = face_system.get_camera_frame()
        if frame is None:
            raise HTTPException(status_code=400, detail="Não foi possível acessar a câmera")

        # Reconhecer face
        access_granted, user_name, confidence = face_system.recognize_face(frame)

        # Registrar log de acesso
        access_log = AccessLog(
            user_name=user_name,
            access_granted=access_granted,
            confidence_score=f"{confidence:.1f}%" if confidence > 0 else None
        )

        db.add(access_log)
        db.commit()

        # Preparar resposta
        if access_granted:
            message = f"Acesso liberado para {user_name}"
            logger.info(f"Acesso liberado: {user_name} (confiança: {confidence:.1f}%)")
        else:
            message = "Acesso negado - Pessoa não autorizada"
            logger.warning("Acesso negado - Pessoa não autorizada")

        return AccessResponse(
            access_granted=access_granted,
            user_name=user_name,
            message=message,
            confidence_score=f"{confidence:.1f}%" if confidence > 0 else None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na verificação de acesso por câmera: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.get("/access/logs")
async def get_access_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Obter logs de tentativas de acesso"""
    logs = db.query(AccessLog).order_by(AccessLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "user_name": log.user_name,
            "access_granted": log.access_granted,
            "timestamp": log.timestamp,
            "confidence_score": log.confidence_score
        }
        for log in logs
    ]


@app.get("/camera/stream")
async def camera_stream():
    """Stream da câmera para o frontend"""
    def generate():
        cap = cv2.VideoCapture(0)
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Codificar frame como JPEG
                buffer = cv2.imencode('.jpg', frame)[1]
                frame_data = buffer.tobytes()

                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n'
                )
        except Exception as e:
            logger.error(f"Erro no stream da câmera: {e}")
        finally:
            cap.release()

    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Obter estatísticas do sistema"""
    total_users = db.query(AuthorizedUser).filter(AuthorizedUser.is_active == True).count()
    total_attempts = db.query(AccessLog).count()
    granted_attempts = db.query(AccessLog).filter(AccessLog.access_granted == True).count()
    denied_attempts = total_attempts - granted_attempts

    return {
        "total_authorized_users": total_users,
        "total_access_attempts": total_attempts,
        "granted_attempts": granted_attempts,
        "denied_attempts": denied_attempts,
        "success_rate": (granted_attempts / total_attempts * 100) if total_attempts > 0 else 0
    }
