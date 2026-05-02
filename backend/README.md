# FactCheck Backend

Real-time fact-checking REST API built with **FastAPI + MongoDB**.  
Single-user login via JWT (access + refresh token rotation).

---

## Project structure

```
factcheck-backend/
├── app/
│   ├── main.py                  # FastAPI app, middleware, router registration
│   ├── core/
│   │   ├── config.py            # Settings (pydantic-settings, reads .env)
│   │   ├── database.py          # MongoDB async client + index creation
│   │   └── security.py          # JWT creation/verification, password hashing
│   ├── models/
│   │   ├── auth.py              # Login, token, change-password schemas
│   │   ├── claim.py             # Claim create/update/out schemas + enums
│   │   └── verdict.py           # Verdict schemas
│   ├── routers/
│   │   ├── auth.py              # /auth  — login, refresh, logout, change-password
│   │   ├── claims.py            # /claims — CRUD + full-text search
│   │   ├── verdicts.py          # /verdicts — CRUD + link to claims
│   │   └── admin.py             # /admin — stats, queue, activity
│   ├── services/
│   │   └── claim_processor.py   # Background task: lang detect, dedup, priority, dispatch
│   └── middleware/
│       └── rate_limit.py        # IP-based 60 req/min rate limiter
├── scripts/
│   └── hash_password.py         # Generate bcrypt hash for .env
├── tests/
│   └── test_api.py              # pytest async test suite
├── .env.example
├── requirements.txt
└── README.md
```

---

## Quick start

### 1. Prerequisites

- Python 3.11+
- MongoDB running locally on port 27017

```bash
# macOS
brew install mongodb-community && brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod
```

### 2. Install dependencies

```bash
cd backend
python -m venv seethru
source seethru/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Generate a secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Set your admin password:
```bash
python scripts/hash_password.py "your-strong-password"
# Copy the output into .env as ADMIN_PASSWORD_HASH=...
```

### 4. Run the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/docs

---

## API overview

### Auth

| Method | Endpoint                     | Description                        |
|--------|------------------------------|------------------------------------|
| POST   | `/api/v1/auth/login`         | Login → access + refresh token     |
| POST   | `/api/v1/auth/refresh`       | Rotate refresh token               |
| POST   | `/api/v1/auth/logout`        | Revoke refresh token               |
| POST   | `/api/v1/auth/change-password` | Change admin password            |
| GET    | `/api/v1/auth/me`            | Current user info                  |

### Claims

| Method | Endpoint                       | Description                          |
|--------|--------------------------------|--------------------------------------|
| POST   | `/api/v1/claims/`              | Submit a new claim                   |
| GET    | `/api/v1/claims/`              | List claims (filter, paginate, sort) |
| GET    | `/api/v1/claims/search?q=...`  | Full-text search                     |
| GET    | `/api/v1/claims/{id}`          | Get single claim                     |
| PATCH  | `/api/v1/claims/{id}`          | Update status or priority            |
| DELETE | `/api/v1/claims/{id}`          | Delete claim                         |

### Verdicts

| Method | Endpoint                            | Description                     |
|--------|-------------------------------------|---------------------------------|
| POST   | `/api/v1/verdicts/`                 | Create verdict for a claim      |
| GET    | `/api/v1/verdicts/claim/{claim_id}` | All verdicts for a claim        |
| GET    | `/api/v1/verdicts/{id}`             | Get single verdict              |
| PATCH  | `/api/v1/verdicts/{id}`             | Update verdict                  |
| DELETE | `/api/v1/verdicts/{id}`             | Delete verdict                  |

### Admin

| Method | Endpoint                              | Description                   |
|--------|---------------------------------------|-------------------------------|
| GET    | `/api/v1/admin/stats`                 | Claim/verdict counts + queue  |
| GET    | `/api/v1/admin/queue`                 | Pending/processing claims     |
| POST   | `/api/v1/admin/queue/{id}/reprocess`  | Re-queue a claim              |
| DELETE | `/api/v1/admin/sessions`              | Revoke all refresh tokens     |
| GET    | `/api/v1/admin/activity?days=7`       | Daily submission counts       |

---

## Example workflow

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' | jq -r .access_token)

# 2. Submit a claim
curl -X POST http://localhost:8000/api/v1/claims/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Scientists have confirmed that drinking coffee reverses aging.",
    "source": "api",
    "priority": 3
  }'

# 3. Create a verdict
curl -X POST http://localhost:8000/api/v1/verdicts/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "claim_id": "<id from step 2>",
    "label": "false",
    "confidence": 0.92,
    "explanation": "No peer-reviewed study supports this claim. Several studies show moderate benefits but none demonstrate reversal of aging.",
    "evidence": [
      {
        "source": "PubMed #12345678",
        "excerpt": "Coffee consumption linked to reduced oxidative stress, not age reversal.",
        "relevance_score": 0.85,
        "supports_claim": false
      }
    ]
  }'
```

---

## Running tests

```bash
pytest tests/ -v
```

---

## Extending the processing pipeline

`app/services/claim_processor.py` is where you plug in real verification logic:

- **Language detection** — swap the stub with `langdetect` or a cloud API
- **Deduplication** — replace full-text search with vector embeddings (pgvector, Pinecone, Qdrant)
- **Verification dispatcher** — call an LLM, publish to Kafka, or hit external APIs

---

## Security notes

- Default password is `changeme123!` — **change it immediately** via `/auth/change-password`
- Set a strong random `SECRET_KEY` in `.env` before any real use
- Refresh tokens are rotated on every use (one-time tokens)
- MongoDB TTL index auto-expires refresh tokens after 7 days
- Rate limiter: 60 requests/minute per IP