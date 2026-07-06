# AI Knowledge Workspace

> Notion + ChatGPT for your own documents. Upload documents into workspaces, then ask questions that are answered **only** from what you uploaded — every answer comes with citations back to the source.

Built as a portfolio project demonstrating: MERN stack engineering, Python RAG implementation, clean service boundaries, async processing patterns, and production-grade error handling.

---

## Architecture

Three services, three responsibilities, no overlap:

```
React (Vite+TS)  →  Node/Express (TS)  →  MongoDB / Redis
                          ↓
                   Python/FastAPI  →  Gemini API
                          ↓
              MongoDB Atlas Vector Search
```

| Service | Owns |
|---|---|
| **React** | UI state, routing, polling, chat interface — no business logic |
| **Node/Express** | Auth, JWT, workspace/document CRUD, chat history, orchestrating Python — never touches RAG logic |
| **Python/FastAPI** | Parsing, chunking, embeddings, vector search, prompt construction, Gemini calls — never touches users/auth |

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query
- **Backend:** Node.js, Express, TypeScript, Mongoose, ioredis, Multer, JWT
- **AI Service:** Python, FastAPI, Google GenAI SDK (Gemini), pypdf, python-docx
- **Database:** MongoDB (+ Atlas Vector Search for embeddings)
- **Cache:** Redis
- **Infra:** Docker Compose

---

## Project Structure

```
ai-knowledge-workspace/
├── client/           # React + TS + Vite frontend
├── server/           # Node + Express API gateway
├── python-ai/        # FastAPI RAG service
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Option A — Docker Compose (recommended)

1. Copy environment files:
   ```bash
   cp server/.env.example server/.env
   cp python-ai/.env.example python-ai/.env
   cp client/.env.example client/.env
   ```
2. Add your Gemini API key to `python-ai/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. **Important:** set the same value for `INTERNAL_SERVICE_SECRET` in both `server/.env` and `python-ai/.env` — this is the shared secret Python uses to authenticate its status-callback to Node.
4. Start everything:
   ```bash
   docker compose up --build
   ```
5. Open the app:
   - Frontend: http://localhost:5173
   - Node API: http://localhost:5000/api
   - Python AI service: http://localhost:8000
   - Node health check (also pings Python): http://localhost:5000/health

### Option B — Run services locally without Docker

You'll need local MongoDB and Redis running first (or point `.env` at hosted instances).

```bash
# Terminal 1 — Node server
cd server
npm install
cp .env.example .env   # edit values
npm run dev

# Terminal 2 — Python AI service
cd python-ai
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GEMINI_API_KEY
uvicorn app.main:app --reload

# Terminal 3 — React client
cd client
npm install
cp .env.example .env
npm run dev
```

---

## Environment Variables

**server/.env**

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets — change in production |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes |
| `PYTHON_AI_URL` | Base URL of the FastAPI service |
| `INTERNAL_SERVICE_SECRET` | Shared secret validating Python's callback to Node |
| `CLIENT_ORIGIN` | CORS allow-origin for the frontend |
| `MAX_UPLOAD_SIZE_MB` | Upload size limit |

**python-ai/.env**

| Variable | Purpose |
|---|---|
| `MONGO_URI` | Same MongoDB instance as Node (Python queries `document_chunks` directly) |
| `GEMINI_API_KEY` | Your Google GenAI API key |
| `GEMINI_EMBEDDING_MODEL` / `GEMINI_GENERATION_MODEL` | Model names |
| `NODE_CALLBACK_URL` | Node's internal `/index-callback` endpoint |
| `INTERNAL_SERVICE_SECRET` | Must match Node's value |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | Chunking configuration (characters) |
| `TOP_K` | Number of chunks retrieved per query |
| `SIMILARITY_THRESHOLD` | Minimum vector similarity score to include a chunk |

**client/.env**

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Node API base URL |

---

## API Reference

### Node (`/api`) — client-facing

```
POST   /api/auth/signup            { email, password }
POST   /api/auth/login             { email, password }
POST   /api/auth/refresh           (refresh token via httpOnly cookie)
POST   /api/auth/logout            (requires auth)

GET    /api/workspaces
POST   /api/workspaces             { name }
GET    /api/workspaces/:id
DELETE /api/workspaces/:id

POST   /api/documents              multipart: workspaceId, file
GET    /api/documents?workspaceId=
GET    /api/documents/:id/status
DELETE /api/documents/:id
POST   /api/documents/index-callback   (internal only — Python → Node)

POST   /api/chat                   { workspaceId, question }
GET    /api/chat?workspaceId=

GET    /api/dashboard/stats
```

### Python (internal only — not exposed to the browser)

```
POST /index-document    { documentId, workspaceId, filePath, mimeType }
POST /query              { workspaceId, question }
GET  /health
```

---

## How Document Indexing Works (Non-Blocking)

1. Client uploads a file → Node validates, saves it, stores metadata with `status: "processing"`, and **immediately returns 202** to the client.
2. Node fires `POST /index-document` to Python without waiting for it to finish.
3. Python acknowledges instantly (`{ accepted: true }`) and processes in a background task: extract text → clean → chunk → embed → store vectors.
4. On completion, Python calls back to Node's internal `/index-callback` with `ready` or `failed` (+ error message).
5. The frontend polls `GET /api/documents/:id/status` every few seconds until the document is no longer `processing`.

Chat is blocked (`409`) for a workspace until at least one document is `ready`.

---

## How the RAG Pipeline Works

1. User asks a question → Node checks Redis for a cached answer to this exact question in this workspace.
2. Cache miss → Node forwards to Python.
3. Python embeds the question, runs vector search scoped to the workspace, and retrieves the top-K most similar chunks above a similarity threshold.
4. If no chunks clear the threshold, Python returns the "couldn't find this" message **without calling Gemini** — a deliberate second layer of hallucination defense beyond the prompt instruction.
5. Otherwise, Python builds a grounded prompt (context + question), calls Gemini, and returns the answer with citations (filename, page number if available, chunk id, and an excerpt for source preview).
6. Node stores the exchange in chat history and caches the response.

---

## Testing

```bash
# Node/Express
cd server
npm test                    # everything — the two DB-integration files below need network access once
npx jest tests/workspace.cascade.unit.test.ts tests/document.upload.integration.test.ts  # no network required

# Python — pytest
cd python-ai
pip install -r requirements-dev.txt
pytest tests/ -v
```

**Node tests:**
- `auth.service.test.ts` / `workspace.service.test.ts` — signup/login/duplicate-email rejection, refresh token rotation, workspace ownership scoping. Use `mongodb-memory-server`, which downloads a `mongod` binary on first run (needs network once).
- `workspace.cascade.unit.test.ts` — verifies deleting a workspace cascades to its documents, chat history, and vector chunks, and cleans up files on disk. Fully mocked, no database needed.
- `document.upload.integration.test.ts` — verifies uploaded files are cleaned up from disk if the request fails validation/authorization *after* Multer has already written them (a real bug caught and fixed during development — see below). Uses real Express + real disk I/O with only the DB-touching services mocked.

**Python tests:**
- `test_chunking.py` — the recursive chunking algorithm (short text, long text, page-number preservation, empty input).
- `test_indexing.py` — the full parse→chunk→embed→store→callback pipeline against a mocked Gemini provider and an in-memory Mongo (`mongomock-motor`), including failure paths (empty file, unsupported type, missing file, re-indexing idempotency).
- `test_retrieval_generation.py` — cosine similarity math, workspace-isolation in vector search, and the no-hallucination short-circuit (asserts Gemini is never called when no relevant chunks are found).
- `test_api.py` — FastAPI endpoint contracts (health, index-document ack, query without a configured Gemini key).

---

## Bugs Found and Fixed During Development

Worth knowing about since they reflect real trade-offs, not just "it works":

1. **Orphaned uploaded files.** Multer writes a file to disk *before* the route handler runs. The original `uploadHandler` threw validation/authorization errors (missing `workspaceId`, unauthorized workspace) after that write, leaving the file on disk forever. Fixed by wrapping the handler in try/catch that deletes the file on any failure path. Caught by `document.upload.integration.test.ts`, which was verified against the reverted buggy version to confirm it actually catches the regression.
2. **No cascade delete on workspace deletion.** Deleting a workspace only deleted the `Workspace` row, leaving its documents, their files on disk, their indexed vector chunks, and its chat history all orphaned. Fixed in `workspace.service.ts`; covered by `workspace.cascade.unit.test.ts`.
3. **Deleting a single document didn't clean up its vector chunks**, meaning a "removed" document's content could still be retrieved and cited in chat answers. Fixed by having `document.service.ts` also delete matching rows from `document_chunks` on document (and workspace) deletion.
4. **Missing shared volume in Docker Compose.** Node saves uploads to a path it then hands to Python for indexing, but `python-ai`'s service definition had no volume mount for that directory — every indexing attempt would fail with a file-not-found error when actually run via `docker compose up`. Fixed by mounting the same host directory at the same path (`/app/uploads`) in both containers.
5. **Multer's file-size-limit error wasn't handled**, so an oversized upload returned a generic 500 instead of a clean 400. Fixed in `error.middleware.ts`.
6. **Import-style testability bug in the Python service.** `indexing.py`, `retrieval.py`, and `query.py` imported `get_db`/`get_provider` as bare functions (`from app.db.mongo import get_db`), which binds a reference at import time — patching the source module afterward (the standard test-mocking approach) silently had no effect and produced false-positive test passes. Fixed by importing the module itself and calling `module.get_db()` at call time.
7. **`google-genai` version pin was stale** (`0.3.0`) and didn't match the `Client`-based API actually used in `gemini_provider.py`. Verified the real API surface against the installed SDK and corrected the pin.

---

## Deliberate Scope Decisions (for interview discussion)

- **Fire-and-forget indexing instead of a message queue (Kafka/RabbitMQ):** sufficient for a single-instance deployment; at scale this HTTP call would be replaced by a durable queue so indexing survives a Python service restart, without changing the interface Node depends on.
- **Polling instead of WebSockets/SSE:** document indexing takes seconds, not milliseconds — polling every few seconds is simpler to reason about and fully sufficient here.
- **Provider abstraction layer around Gemini:** `python-ai/app/providers/base_provider.py` defines the interface; `gemini_provider.py` is the only file that would change if swapping providers.
- **Two-layer hallucination defense:** a prompt-level instruction to refuse ungrounded answers, plus a retrieval-level similarity threshold that skips the LLM call entirely when no relevant chunks exist.
- **Vector search with a local fallback:** Python attempts MongoDB Atlas `$vectorSearch` first, and falls back to in-process cosine similarity if the Atlas vector index isn't available — so the project also runs against a plain local MongoDB in Docker Compose without requiring an Atlas cluster.
- **Shared filesystem between Node and Python instead of streaming the file over HTTP:** Node saves the upload to `server/uploads/` and passes Python the absolute path rather than the file bytes. This keeps the `/index-document` payload tiny, but it means both containers must mount the same host directory at the same path (`docker-compose.yml` does this deliberately — see the comment there). At real scale this coupling would be replaced by object storage (e.g. S3) that both services read from independently, removing the shared-volume dependency entirely.
- **Not implemented on purpose:** Kubernetes, message brokers, microservices beyond the three described, LangGraph/agents, OCR, image RAG, voice, Elasticsearch, graph databases, complex permissions, notifications, billing. Scope stayed on the RAG/full-stack story rather than feature count.
