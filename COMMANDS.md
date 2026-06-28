# TubeFlow — Commands Reference

## Backend (FastAPI)

All commands run from the `backend/` directory.

```bash
cd backend
```

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

> Use a virtual environment to keep packages isolated:
> ```bash
> python -m venv .venv
> source .venv/bin/activate   # Windows: .venv\Scripts\activate
> pip install -r requirements.txt
> ```

### 2. Environment variables

Create a `.env` file in `backend/` with at least the following:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/tubeflow
SECRET_KEY=your-secret-key-here
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key
YOUTUBE_REDIRECT_URI=http://localhost:8001/api/v1/youtube/callback
FRONTEND_URL=http://localhost:3000
```

### 3. Run database migrations

```bash
alembic upgrade head
```

To check the current migration state:

```bash
alembic current
```

To roll back one step:

```bash
alembic downgrade -1
```

### 4. Start the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

API will be available at: `http://localhost:8001`  
Interactive docs: `http://localhost:8001/docs`

---

## Frontend (Next.js)

All commands run from the `frontend/` directory.

```bash
cd frontend
```

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

`.env.local` contents:

```env
BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
```

### 3. Start the dev server

```bash
npm run dev
```

App will be available at: `http://localhost:3000`

### 4. Build for production

```bash
npm run build
npm run start
```

---

## Quick Start (both services)

Open two terminal tabs:

**Tab 1 — Backend**
```bash
cd backend
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

**Tab 2 — Frontend**
```bash
cd frontend
npm run dev
```
