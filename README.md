# 🔐 Controle de Acesso Facial

Sistema completo de **controle de acesso por reconhecimento facial**, desenvolvido com **FastAPI (Python)** no back-end e **React (TypeScript)** no front-end.

O projeto permite autenticação facial, gerenciamento de usuários e documentos com diferentes níveis de permissão, e registro detalhado de logs de acesso.

---

## 🚀 Tecnologias Principais

### **Back-end**

- [FastAPI](https://fastapi.tiangolo.com/) — framework moderno e performático.
- [Uvicorn](https://www.uvicorn.org/) — servidor ASGI para rodar o FastAPI.
- [OpenCV](https://opencv.org/) — captura e manipulação de imagens.
- [face-recognition](https://github.com/ageitgey/face_recognition) — detecção e comparação facial.
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM para banco de dados.
- [Pillow](https://pillow.readthedocs.io/) — processamento de imagens.
- [NumPy](https://numpy.org/) — suporte numérico.
- [Pydantic](https://docs.pydantic.dev/) — validação e tipagem de dados.
- [python-multipart](https://andrew-d.github.io/python-multipart/) — upload de imagens via formulário.

### **Front-end**
- [React](https://react.dev/) com TypeScript.
- [Material-UI (MUI)](https://mui.com/) — componentes visuais modernos.
- Integração via Axios com a API FastAPI.



## ⚙️ Estrutura do Projeto

### 🧩 Back-end
facial-access-control/
│
├── api.py # Rotas e endpoints principais (usuários, documentos, acesso)
├── database.py # Modelos e conexão com o banco (SQLAlchemy + SQLite)
├── models.py # Modelos Pydantic para requests/responses
├── face_recognition_module.py # Lógica de reconhecimento facial com OpenCV + face_recognition
├── logging_config.py # Configuração e rotação de logs
├── main.py # Ponto de entrada (executa o servidor Uvicorn)
└── data/
├── access_control.db # Banco de dados SQLite
├── documents/ # Pasta com arquivos enviados
└── logs/ # Arquivos de log rotativos


### 🖥️ Front-end
frontend/
│
├── src/
│ ├── components/
│ │ ├── CameraAccess.tsx
│ │ ├── Dashboard.tsx
│ │ ├── DocumentsManagement.tsx
│ │ └── UserManagement.tsx
│ ├── services/api.ts
│ ├── App.tsx
│ └── index.tsx
└── package.json



## 📦 Instalação

### 🔹 Back-end (FastAPI)
1. Crie e ative um ambiente virtual:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
Instale as dependências:

pip install -r requirements.txt
Inicie o servidor:


uvicorn main:app --reload
Acesse:


http://localhost:8000/docs
→ Interface interativa do Swagger para testar os endpoints.

🔹 Front-end (React)
Vá para a pasta frontend/


cd frontend
Instale as dependências:


npm install
Execute o projeto:


npm start
Acesse:


http://localhost:3000
🧠 Funcionalidades
Módulo	Descrição
👤 Usuários	Cadastro, atualização e listagem de usuários autorizados com nível de acesso (BÁSICO, INTERMEDIÁRIO, TOTAL).
📸 Reconhecimento Facial	Autenticação via imagem ou câmera ao vivo, com bloqueio automático após múltiplas tentativas falhas.
📂 Documentos	Upload e download de arquivos com controle de permissão conforme nível de acesso.
📊 Dashboard	Exibe estatísticas em tempo real: usuários cadastrados, tentativas de acesso, taxa de sucesso e bloqueios ativos.
🧾 Logs	Registros detalhados de ações e eventos do sistema (acessos, erros, bloqueios, uploads).

🧱 Dependências (requirements.txt)

fastapi>=0.104.0
uvicorn>=0.24.0
opencv-python>=4.8.0
face-recognition>=1.3.0
numpy>=1.26.0
Pillow>=10.0.0
python-multipart>=0.0.6
pydantic>=2.5.0
SQLAlchemy>=2.0.0
python-jose>=3.3.0
passlib>=1.7.4
bcrypt>=4.0.0
python-dotenv>=1.0.0
cmake>=3.18.0
dlib>=19.24.0
⚠️ Observação: Nem todas as bibliotecas são usadas diretamente pelo seu código atual, mas estão incluídas por compatibilidade e suporte a futuras funcionalidades (como autenticação com senha, JWT e compilação de dlib).

🧩 Endpoints Principais
Método	Endpoint	Descrição
POST	/users/register	Cadastra novo usuário com imagem facial.
GET	/users	Lista usuários autorizados.
POST	/access/check	Verifica imagem enviada e retorna se o acesso é permitido.
POST	/access/check-camera	Verifica acesso usando câmera ativa.
GET	/documents	Lista documentos acessíveis conforme nível de usuário.
POST	/documents/upload	Envia novo documento e define nível de confidencialidade.
GET	/documents/{id}/download	Baixa documento permitido.
GET	/stats	Estatísticas de uso e bloqueios.

📜 Licença

Este projeto é de uso acadêmico e pode ser adaptado para fins educacionais ou de demonstração.
