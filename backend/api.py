from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from sqlalchemy.orm import Session
import cv2
import numpy as np
import base64
import io
import os
import shutil
from datetime import datetime
from typing import List, Optional
import logging
from functools import wraps

from database import get_db, init_database, AuthorizedUser, AccessLog, Document, AccessLevel, DocumentLevel as ModelDocumentLevel, get_accessible_documents
from models import (UserCreate, UserResponse, AccessResponse, UserUpdate, DocumentCreate, 
                DocumentResponse, DocumentAccessResponse, AccessResponse, 
                AccessLevel as ModelAccessLevel)
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
    access_level: ModelAccessLevel = Form(default= "BASICO"),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    logger.info(f"Recebendo cadastro: name= {name}, email{email}, access_level={access_level}")
    """Registrar um novo usuário autorizado com sua foto e nível de acesso"""
    try:
        # Verificar se o usuário já existe
        existing_user = db.query(AuthorizedUser).filter(AuthorizedUser.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Usuário já registrado")
        
        #validar nivel de acesso
        try:
            user_access_level = AccessLevel(access_level)
        except ValueError:
            raise HTTPException(status_code=400, detail="Nível de acesso inválido")

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
            image_path=final_image_path,
            access_level=user_access_level.value
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
    user = None

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
        
        #Buscar dados do usuario se reconhecido
        user_access_level = None
        user_id = None
        if access_granted and user_name:
            user = db.query(AuthorizedUser).filter(AuthorizedUser.name == user_name).first()
            if user:
                user_access_level = ModelAccessLevel(user.access_level)
                user_id = user.id


        # Registrar log de acesso
        access_log = AccessLog(
            user_name=user_name,
            user_id=user_id,
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

        confidence_value= confidence if confidence is not None else 0.0

        return AccessResponse(
            access_granted=access_granted,
            user_name=user_name,
            message=message,
            confidence_score=f"{confidence_value:.1f}%",
            user_email=user.email if user else None

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


@app.get("/users/email/{email}")
async def get_user_by_email(email: str, db: Session = Depends(get_db)):
    """
    Buscar usuário autorizado pelo email.
    Usado pelo frontend para determinar o nível de acesso após reconhecimento facial.
    """
    try:
        user = db.query(AuthorizedUser).filter(AuthorizedUser.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "access_level": user.access_level,
            "is_active": user.is_active,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar usuário por email: {e}")
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

def require_access_level(required_level: AccessLevel):
    """Decorator para verificar nível de acesso do usuário"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):

            return await func(*args, **kwargs)
        return wrapper
    return decorator

@app.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db)
):
    """Atualizar informações de um usuário autorizado"""
    try:
        user = db.query(AuthorizedUser).filter(AuthorizedUser.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        # Atualizar campos
        if user_update.name is not None:
            user.name = user_update.name
        if user_update.access_level is not None:
            try:
                access_level_enum = AccessLevel(user_update.access_level)
                user.access_level = access_level_enum.value
            except ValueError:
                raise HTTPException(status_code=400, detail="Nível de acesso inválido")
        if user_update.is_active is not None:
            user.is_active = user_update.is_active

        db.commit()
        db.refresh(user)

        logger.info(f"Usuário atualizado: {user.name} ({user.email})")
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    
@app.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    title: str = Form(...),
    description: str = Form(default=""),
    document_level: ModelDocumentLevel = Form(default=ModelDocumentLevel.LIVRE),
    uploader_email: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload de um novo documento com nível de acesso
    """

    try:
        # Verificar se o usuário existe
        uploader = db.query(AuthorizedUser).filter(AuthorizedUser.email == uploader_email).first()
        if not uploader:
            raise HTTPException(status_code=404, detail="Usuário remetente não encontrado")

        # Validar nível de acesso do documento
        try:
            doc_level = ModelDocumentLevel(document_level)
        except ValueError:
            raise HTTPException(status_code=400, detail="Nível de documento inválido")
        
        #Criar diretório se não existir
        documents_dir = "data/documents"
        os.makedirs(documents_dir, exist_ok=True)

        # Salvar arquivo
        timestamp = datetime.now().timestamp()
        filename = f"{timestamp}_{file.filename}"
        file_path = f"data/documents/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Salvar no banco de dados
        db_document = Document(
            title=title,
            filename=file.filename,
            description=description,
            document_level=doc_level.value,
            file_path=file_path,
            uploaded_by=uploader.id
        )

        db.add(db_document)
        db.commit()
        db.refresh(db_document)

        logger.info(f"Documento enviado: {title} por {uploader.name}, email: {uploader.email}")
        return db_document

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao enviar documento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/documents", response_model=DocumentAccessResponse)
async def get_documents(
    user_email: str,
    db: Session = Depends(get_db)
):
    """Obter documentos acessíveis para um usuário autorizado"""
    try:
        # Verificar se o usuário existe
        user = db.query(AuthorizedUser).filter(AuthorizedUser.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        acessible_levels = get_accessible_documents(AccessLevel(user.access_level))

        #Buscar documentos acessíveis
        documents = db.query(Document).filter(
            Document.document_level.in_(acessible_levels)).all()
        
        """#Converter documentos para DocumentResponse
        documents_response: List[DocumentResponse] = [
            DocumentResponse(
                id=doc.id,
                title=doc.title,
                description=doc.description,
                document_level=doc.document_level
            )
            for doc in documents
        ]"""
        
        #Log de acesso aos documentos
        access_log = AccessLog(
            user_name=user.name,
            user_id=user.id,
            access_granted=True,
            access_type="document_access"
        )
        db.add(access_log)
        db.commit()

        """antiga versão
            return DocumentAccessResponse(
            documents=documents,
            user_acess_level=ModelAccessLevel(user.access_level),
            total_available=len(documents)
        )
        """
        #Converter documentos para DocumentResponse
        documents_response: List[DocumentResponse] = [
            DocumentResponse.from_orm(doc)  # ⬅ melhor forma usando from_orm
            for doc in documents
        ]

        return DocumentAccessResponse(
            documents=documents_response,  # ⬅ objetos SQLAlchemy agora funcionam com orm_mode
            user_acess_level=ModelAccessLevel(user.access_level),
            total_available=len(documents)
)

    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter documentos: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    
@app.get("/documents/{document_id}/download")
async def download_document(
    document_id: int,
    user_email: str,
    db: Session = Depends(get_db)
):
    """Download de um documento se o usuário tiver acesso"""
    try:
        # Verificar se o usuário existe
        user = db.query(AuthorizedUser).filter(AuthorizedUser.email == user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        # Verificar se o documento existe
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Documento não encontrado")

        # Verificar nível de acesso
        acessible_levels = get_accessible_documents(AccessLevel(user.access_level))
        if document.document_level not in acessible_levels:
            #log de acesso negado
            access_log = AccessLog(
                user_name=user.name,
                user_id=user.id,
                access_granted=False,
                access_type="document_access",
                document_id=document.id
            )
            db.add(access_log)
            db.commit()    

            raise HTTPException(status_code=403, detail="Acesso negado ao documento")
        

        #verifica se o aruqivo existe
        if not os.path.exists(document.file_path):
            raise HTTPException(status_code=404, detail="Arquivo do documento não encontrado")
        

        # Log de download bem sucedido ao documento
        access_log = AccessLog(
            user_name=user.name,
            user_id=user.id,
            access_granted=True,
            access_type="document_download",
            document_id=document.id
        )
        db.add(access_log)
        db.commit()

        return FileResponse(
            path=document.file_path,
            filename=document.filename,
            media_type='application/octet-stream'
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao fazer download do documento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    


@app.get("/documents/levels")
async def get_document_levels():
    """Obter níveis de documentos disponíveis"""
    return {
        "documents_levels": [
            {"value": "LIVRE", "label": "Livre", "description": "Acesso livre para acesso público"},
            {"value": "RESTRITO", "label": "Restrito" ,"description": "Acesso restrito para usuários autorizados"},
            {"value": "CONFIDENCIAL", "label": "Confidencial","description": "Acesso confidencial para usuários com nível total"}
        ],

        "access_levels": [
            {"value": "BASICO", "label": "Básico","description": "Acesso básico: documentos de nível livre"},
            {"value": "INTERMEDIARIO", "label": "Intermediário","description": "Acesso intermediário: documentos de nível livre e restrito"},
            {"value": "TOTAL", "label": "Total","description": "Acesso total: todos os níveis de documentos"}
        ]
    }