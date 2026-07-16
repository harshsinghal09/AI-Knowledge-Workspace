# AI Knowledge Workspace

An AI-powered document workspace that enables users to upload documents, build a searchable knowledge base, and ask natural language questions with citation-backed answers using a Retrieval-Augmented Generation (RAG) pipeline.

## Demo

**Live Demo:** https://your-demo-link.com

**GitHub:** https://github.com/your-username/AI-Knowledge-Workspace

---

# Features

- User Authentication (JWT)
- Workspace Management
- Upload PDF, DOCX, Markdown, and TXT files
- Asynchronous document indexing
- Semantic search using vector embeddings
- Citation-backed AI responses
- Google Gemini integration
- Multi-document retrieval
- Document status tracking
- Dockerized microservices architecture

---

# Architecture

```
                +----------------------+
                |      React Client    |
                +----------+-----------+
                           |
                           |
                    REST API Requests
                           |
                           v
                +----------------------+
                |  Node.js + Express   |
                |      Backend API     |
                +----------+-----------+
                           |
        -----------------------------------------
        |                                       |
        |                                       |
        v                                       v
 MongoDB                             Python FastAPI Service
(Document Metadata)               (RAG + AI Processing)
                                           |
                                           |
                              -----------------------------
                              |                           |
                              |                           |
                              v                           v
                   Google Gemini API             Vector Embeddings
```

---

# Tech Stack

### Frontend

- React.js
- TypeScript
- React Query
- React Router

### Backend

- Node.js
- Express.js
- TypeScript

### AI Service

- Python
- FastAPI
- Google Gemini API

### Database

- MongoDB

### Infrastructure

- Docker
- Docker Compose

---

# Project Structure

```
AI-Knowledge-Workspace
│
├── client/
│   ├── src/
│   ├── public/
│   └── Dockerfile
│
├── server/
│   ├── src/
│   ├── uploads/
│   └── Dockerfile
│
├── python-ai/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── providers/
│   │   └── db/
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

# RAG Pipeline

```
Upload Document
        │
        ▼
Extract Text
        │
        ▼
Clean Text
        │
        ▼
Chunk Document
        │
        ▼
Generate Embeddings
        │
        ▼
Store Embeddings
        │
        ▼
User Question
        │
        ▼
Generate Query Embedding
        │
        ▼
Semantic Search
        │
        ▼
Retrieve Relevant Chunks
        │
        ▼
Google Gemini
        │
        ▼
Citation-backed Answer
```

---

# How It Works

### Document Upload

- User uploads a document.
- Metadata is stored in MongoDB.
- Python AI service indexes the document asynchronously.

### Indexing

- Extracts text.
- Cleans the content.
- Splits into chunks.
- Generates vector embeddings.
- Stores embeddings in MongoDB.

### Question Answering

When a user asks a question:

1. Generate query embedding.
2. Retrieve most relevant chunks.
3. Build context.
4. Send context + question to Gemini.
5. Return grounded answer with citations.

---

# API Endpoints

## Authentication

```
POST /api/auth/register
POST /api/auth/login
```

## Workspace

```
GET /api/workspaces
POST /api/workspaces
DELETE /api/workspaces/:id
```

## Documents

```
POST /api/documents
GET /api/documents
DELETE /api/documents/:id
```

## Chat

```
POST /api/chat
GET /api/chat/history
```

---

# Running Locally

Clone repository

```bash
git clone https://github.com/your-username/AI-Knowledge-Workspace.git
```

Move into project

```bash
cd AI-Knowledge-Workspace
```

Configure environment variables.

Create:

```
server/.env
python-ai/.env
```

Add your MongoDB URI and Gemini API Key.

Start the project

```bash
docker compose up --build
```

Application URLs

Frontend

```
http://localhost:5173
```

Backend

```
http://localhost:5000
```

Python AI Service

```
http://localhost:8000
```

---

# Environment Variables

## Server

```
PORT=
JWT_SECRET=
MONGO_URI=
PYTHON_AI_URL=
```

## Python AI

```
MONGO_URI=
GEMINI_API_KEY=
GEMINI_EMBEDDING_MODEL=
GEMINI_GENERATION_MODEL=
NODE_CALLBACK_URL=
```

---

# Future Improvements

- Hybrid Search (Keyword + Semantic)
- Streaming AI Responses
- OCR Support
- Image-based Document Retrieval
- Workspace Sharing
- Role-based Access Control
- Redis Caching
- Source Highlighting
- Conversation Memory

---

# Resume Highlights

- Engineered a Retrieval-Augmented Generation (RAG) platform enabling semantic search and citation-backed question answering over uploaded documents.
- Built a Dockerized MERN + FastAPI microservices architecture with asynchronous document indexing and scalable AI-powered document retrieval.

---

# License

MIT License