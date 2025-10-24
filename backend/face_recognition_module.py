import cv2
import face_recognition
import numpy as np
import os
import json
import logging
from datetime import datetime
from typing import List, Tuple, Optional
from PIL import Image, ImageEnhance
import pickle


class FaceRecognitionSystem:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.authorized_faces_dir = 'data/authorized_faces'
        self.tolerance = 0.6
        self.known_face_encodings = []
        self.known_face_names = []
        self.load_authorized_faces()

    def enhance_image_quality(self, image: np.ndarray) -> np.ndarray:
        """Melhora a qualidade da imagem para melhor reconhecimento"""
        # Converter para PIL para processamento
        pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

        # Melhorar contraste
        enhancer = ImageEnhance.Contrast(pil_image)
        pil_image = enhancer.enhance(1.2)

        # Melhorar nitidez
        enhancer = ImageEnhance.Sharpness(pil_image)
        pil_image = enhancer.enhance(1.1)

        # Converter de volta para OpenCV
        return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

    def detect_faces_multiple_methods(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detecta faces usando múltiplos métodos para maior robustez"""
        faces = []
        
        # Método 1: face_recognition (mais preciso)
        face_locations = face_recognition.face_locations(image, model="hog")
        for (top, right, bottom, left) in face_locations:
            faces.append((left, top, right - left, bottom - top))
        
        # Método 2: Haar Cascade (mais rápido, detecta faces inclinadas)
        if not faces:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            haar_faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            for (x, y, w, h) in haar_faces:
                faces.append((x, y, w, h))
        
        return faces

    def process_face_with_rotation(self, image: np.ndarray) -> List[np.ndarray]:
        """Processa a imagem com diferentes rotações para capturar faces inclinadas"""
        processed_encodings = []
        
        # Rotações para testar (em graus)
        rotations = [0, -15, 15, -30, 30]
        
        for angle in rotations:
            if angle != 0:
                # Rotacionar imagem
                rows, cols = image.shape[:2]
                M = cv2.getRotationMatrix2D((cols/2, rows/2), angle, 1)
                rotated = cv2.warpAffine(image, M, (cols, rows))
            else:
                rotated = image.copy()
            
            # Tentar extrair encoding da face
            try:
                face_encodings = face_recognition.face_encodings(rotated)
                if face_encodings:
                    processed_encodings.extend(face_encodings)
            except Exception as e:
                self.logger.warning(f"Erro ao processar rotação {angle}°: {e}")
        
        return processed_encodings

    def register_face(self, image_path: str, name: str, email: str) -> Tuple[bool, str, Optional[str]]:
        """
        Registra uma nova face autorizada
        
        Returns:
            Tuple[bool, str, Optional[str]]: (sucesso, mensagem, encoding_string)
        """
        try:
            # Carregar e processar imagem
            image = cv2.imread(image_path)
            if image is None:
                return False, "Não foi possível carregar a imagem", None
                
            # Melhorar qualidade da imagem
            enhanced_image = self.enhance_image_quality(image)
            
            # Detectar faces
            faces = self.detect_faces_multiple_methods(enhanced_image)
            if not faces:
                return False, "Nenhuma face detectada na imagem", None
            
            if len(faces) > 1:
                return False, "Múltiplas faces detectadas. Use uma imagem com apenas uma pessoa", None
                
            # Processar face com rotações
            face_encodings = self.process_face_with_rotation(enhanced_image)
            
            if not face_encodings:
                return False, "Não foi possível extrair características da face", None
                
            # Usar o primeiro encoding válido
            face_encoding = face_encodings[0]
            
            # Verificar se a face já está registrada
            if self.known_face_encodings:
                matches = face_recognition.compare_faces(
                    self.known_face_encodings,
                    face_encoding,
                    tolerance=self.tolerance
                )
                if any(matches):
                    return False, "Esta face já está registrada no sistema", None
            
            # Salvar encoding
            encoding_str = json.dumps(face_encoding.tolist())
            
            # Adicionar às listas conhecidas
            self.known_face_encodings.append(face_encoding)
            self.known_face_names.append(name)
            
            encoding_file = os.path.join(self.authorized_faces_dir, f"{email}_encoding.json")
            with open(encoding_file, 'w') as f:
                json.dump({
                    'name': name,
                    'email': email,
                    'encoding': face_encoding.tolist(),
                    'image_path': image_path,
                    'created_at': datetime.now().isoformat()
                }, f)
            
            self.logger.info(f"Face registrada com sucesso: {name} ({email})")
            return True, f"Face de {name} registrada com sucesso", encoding_str
            
        except Exception as e:
            self.logger.error(f"Erro ao registrar face: {e}")
            return False, f"Erro interno: {str(e)}", None

    def recognize_face(self, image: np.ndarray) -> Tuple[bool, Optional[str], float]:
        """
        Reconhece uma face na imagem
        
        Returns:
            Tuple[bool, Optional[str], float]: (autorizado, nome, confiança)
        """
        try:
            if not self.known_face_encodings:
                return False, None, 0.0
            
            # Melhorar qualidade da imagem
            enhanced_image = self.enhance_image_quality(image)
            rgb_image = cv2.cvtColor(enhanced_image, cv2.COLOR_BGR2RGB)
            
            # Processar com múltiplas rotações
            face_encodings = self.process_face_with_rotation(rgb_image)
            
            if not face_encodings:
                return False, None, 0.0
                
            best_match_name = None
            best_confidence = 0.0
            
            # Testar cada encoding encontrado
            for face_encoding in face_encodings:
                # Calcular distâncias para todas as faces conhecidas
                face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                
                if len(face_distances) > 0:
                    # Encontrar a melhor correspondência
                    best_match_index = np.argmin(face_distances)
                    min_distance = face_distances[best_match_index]
                    
                    # Converter distância em confiança (0-100%)
                    confidence = max(0, (1 - min_distance) * 100)
                    
                    # Verificar se atende aos critérios
                    if min_distance <= self.tolerance and confidence > best_confidence:
                        best_confidence = confidence
                        best_match_name = self.known_face_names[best_match_index]
            
            # Decidir se autorizar acesso
            access_granted = best_confidence >= 60  # Confiança mínima de 60%
            self.logger.info(
                f"Reconhecimento: {best_match_name if access_granted else 'Não autorizado'}, "
                f"Confiança: {best_confidence:.1f}%"
            )
            return access_granted, best_match_name, best_confidence
            
        except Exception as e:
            self.logger.error(f"Erro no reconhecimento: {e}")
            return False, None, 0.0

    def load_authorized_faces(self):
        """Carrega todas as faces autorizadas do diretório"""
        try:
            if not os.path.exists(self.authorized_faces_dir):
                os.makedirs(self.authorized_faces_dir)
                return

            self.known_face_encodings = []
            self.known_face_names = []
            
            for filename in os.listdir(self.authorized_faces_dir):
                if filename.endswith('_encoding.json'):
                    filepath = os.path.join(self.authorized_faces_dir, filename)
                    try:
                        with open(filepath, 'r') as f:
                            data = json.load(f)
                            encoding = np.array(data['encoding'])
                            name = data['name']
                            self.known_face_encodings.append(encoding)
                            self.known_face_names.append(name)
                    except Exception as e:
                        self.logger.warning(f"Erro ao carregar {filename}: {e}")
            
            self.logger.info(f"Carregadas {len(self.known_face_encodings)} faces autorizadas")
        except Exception as e:
            self.logger.error(f"Erro ao carregar faces autorizadas: {e}")

    def get_camera_frame(self, camera_index: int = 0) -> Optional[np.ndarray]:
        """Captura um frame da câmera"""
        try:
            cap = cv2.VideoCapture(camera_index)
            if not cap.isOpened():
                return None
            
            ret, frame = cap.read()
            cap.release()
            return frame if ret else None
        except Exception as e:
            self.logger.error(f"Erro ao capturar frame da câmera: {e}")
            return None

    def remove_authorized_face(self, email: str) -> bool:
        """Remove uma face autorizada"""
        try:
            encoding_file = os.path.join(self.authorized_faces_dir, f"{email}_encoding.json")
            if os.path.exists(encoding_file):
                os.remove(encoding_file)
                self.load_authorized_faces()  # Recarregar faces
                return True
            return False
        except Exception as e:
            self.logger.error(f"Erro ao remover face: {e}")
            return False