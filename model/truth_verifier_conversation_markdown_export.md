# Multimodal Truth Verification System — Full Conversation Export

## Initial Goal

Build a multimodal truth verification system that:
- accepts text, image, audio, video, metadata inputs,
- converts data into embeddings,
- stores embeddings in a vector database,
- retrieves evidence,
- reasons over evidence,
- determines whether content is true, misleading, manipulated, or false.

---

# Core System Insight

Embeddings alone are NOT sufficient for truth verification.

A correct architecture requires:

```text
multimodal input
    ↓
embedding generation
    ↓
retrieval
    ↓
evidence aggregation
    ↓
reasoning
    ↓
truth confidence score
```

Truth verification requires:
- retrieval,
- external evidence,
- reasoning,
- source credibility,
- temporal awareness.

---

# Recommended High-Level Architecture

```text
                ┌────────────────────┐
                │ Trusted Sources     │
                │ News/APIs/Wiki/etc │
                └─────────┬──────────┘
                          │
                 Data Normalization
                          │
                 Credibility Scoring
                          │
                 Embedding Generation
                          │
                    Vector Database
                          │
────────────────────────────────────────
                          │
                    User Claim
                          │
                 Claim Extraction
                          │
                Multimodal Parsing
             (OCR/image/audio/video)
                          │
                   Embedding Search
                          │
                Evidence Re-ranking
                          │
             Reasoning / Contradiction
                          │
               Truth Confidence Score
                          │
                 Explanation + Sources
```

---

# Important Architectural Principles

## Retrieval ≠ Verification

Vector similarity does not imply factual correctness.

Need:
- source credibility,
- reranking,
- contradiction detection,
- evidence reasoning.

---

# Trusted Data Sources

## Trusted Knowledge Sources
- Reuters
- AP News
- BBC
- Government data
- Scientific journals
- Wikipedia

## Fact-Checking Sources
- Snopes
- PolitiFact
- FactCheck.org
- FullFact
- AFP Fact Check
- AltNews
- BoomLive

## Scientific Sources
- PubMed
- arXiv
- Semantic Scholar

---

# Recommended Models

## Text Embeddings
- BGE-large
- E5-large-v2
- jina-embeddings-v3
- GTE-large

## Image Embeddings
- CLIP
- SigLIP2
- EVA-CLIP
- DINOv2

## Multimodal Models
- Qwen2.5-VL
- InternVL
- LLaVA
- GPT-4o
- Gemini

## Reranking Models
- BGE-reranker
- Cohere rerank
- ColBERT

## OCR
- PaddleOCR
- Tesseract

---

# Recommended Infrastructure

| Layer | Tool |
|---|---|
| Backend | FastAPI |
| Vector DB | Qdrant |
| Search | Elasticsearch/OpenSearch |
| Queue | Redis |
| Workers | Celery |
| Relational DB | PostgreSQL |
| Object Storage | S3 / MinIO |

---

# Recommended Retrieval Design

## Hybrid Retrieval

Use:
- Dense retrieval (embeddings)
- Sparse retrieval (BM25)

Combined ranking:

```text
final_score =
semantic_similarity
× credibility
× freshness
× consistency
```

---

# Recommended Labels

Instead of binary labels:

Use:
- Verified True
- Likely True
- Misleading
- Manipulated
- False
- Unverifiable

---

# MVP Scope

## Include
- Text verification
- Image + caption verification
- Trusted news retrieval
- OCR
- Embeddings
- LLM reasoning

## Skip Initially
- Video verification
- Audio verification
- Social graph analysis
- Full web crawling

---

# Suggested Project Structure

```text
truth-verifier/
│
├── app/
│   ├── api/
│   ├── ingestion/
│   ├── embeddings/
│   ├── retrieval/
│   ├── reasoning/
│   ├── database/
│   ├── utils/
│   └── models/
│
├── data/
├── docker/
├── tests/
├── requirements.txt
├── docker-compose.yml
└── main.py
```

---

# Recommended Development Roadmap

## WEEK 1
- Setup FastAPI
- Setup Qdrant
- Build ingestion pipeline
- Generate embeddings

## WEEK 2
- Add retrieval
- Add reranking
- Build query pipeline

## WEEK 3
- Add LLM reasoning
- Generate verdicts
- Add evidence explanations

## WEEK 4
- Add OCR
- Add image verification
- Add temporal filtering

---

# Full V1 Backend Workflow

## INGESTION PIPELINE

```text
RSS/API
   ↓
clean HTML
   ↓
chunk articles
   ↓
generate embeddings
   ↓
store vectors in Qdrant
```

---

## QUERY PIPELINE

```text
claim/image
   ↓
OCR (if image)
   ↓
extract text
   ↓
generate embeddings
   ↓
retrieve evidence
   ↓
rerank evidence
   ↓
LLM reasoning
   ↓
truth score + explanation
```

---

# Complete Tech Stack

| Task | Tool |
|---|---|
| API | FastAPI |
| Vector DB | Qdrant |
| Embeddings | BGE-large |
| OCR | PaddleOCR |
| LLM | Qwen2.5-VL / GPT-4o |
| Search | Elasticsearch |
| Database | PostgreSQL |
| Queue | Redis |
| Workers | Celery |

---

# Full Coding Workflow

## Step 1 — Create Virtual Environment

```bash
python -m venv venv
```

Activate:

### Windows

```bash
venv\Scripts\activate
```

### Mac/Linux

```bash
source venv/bin/activate
```

---

# Step 2 — Install Dependencies

```txt
fastapi
uvicorn
qdrant-client
sentence-transformers
transformers
torch
openai
psycopg2-binary
sqlalchemy
pydantic
requests
beautifulsoup4
trafilatura
feedparser
paddleocr
pillow
numpy
scikit-learn
elasticsearch
python-dotenv
```

Install:

```bash
pip install -r requirements.txt
```

---

# Step 3 — Setup Docker Services

```yaml
version: '3.8'

services:

  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"

  postgres:
    image: postgres
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
      POSTGRES_DB: verifier
    ports:
      - "5432:5432"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
```

Run:

```bash
docker compose up -d
```

---

# Step 4 — Embedding Module

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "BAAI/bge-large-en-v1.5"
)


def create_embedding(text: str):
    embedding = model.encode(text)
    return embedding.tolist()
```

---

# Step 5 — Qdrant Setup

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance
)

client = QdrantClient(
    host="localhost",
    port=6333
)

COLLECTION_NAME = "news_embeddings"
```

---

# Step 6 — News Ingestion

```python
import feedparser
import uuid

from app.embeddings.embedder import create_embedding
from app.database.qdrant import (
    client,
    COLLECTION_NAME
)

RSS_FEEDS = [
    "https://feeds.reuters.com/reuters/topNews"
]
```

Workflow:

```text
fetch feed
   ↓
extract title + summary
   ↓
embed text
   ↓
store in vector DB
```

---

# Step 7 — Retrieval

```python
results = client.search(
    collection_name=COLLECTION_NAME,
    query_vector=embedding,
    limit=5
)
```

---

# Step 8 — Credibility Weighting

```python
SOURCE_WEIGHTS = {
    "Reuters": 0.98,
    "AP": 0.97,
    "Wikipedia": 0.75
}
```

---

# Step 9 — LLM Verification

Prompt Structure:

```text
Claim:
...

Evidence:
...

Determine:
- verified true
- likely true
- misleading
- false
- unverifiable

Explain reasoning.
```

---

# Step 10 — FastAPI Endpoint

```python
@app.post("/verify")
def verify(request: ClaimRequest):

    results = search_claim(
        request.claim
    )

    verdict = verify_claim(
        request.claim,
        results
    )

    return {
        "claim": request.claim,
        "verdict": verdict
    }
```

---

# Step 11 — OCR Integration

```python
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True)
```

Workflow:

```text
image
  ↓
OCR
  ↓
extract text
  ↓
retrieve evidence
  ↓
reasoning
```

---

# Suggested Future Improvements

## V2
- Reverse image search
- Hybrid search
- Metadata extraction
- EXIF analysis
- Multilingual support

## V3
- Video verification
- Audio verification
- Deepfake detection
- Social graph analysis
- Multi-agent reasoning

---

# Advanced Future Architecture

```text
Agent 1 → news retrieval
Agent 2 → reverse image search
Agent 3 → metadata analysis
Agent 4 → contradiction checking
Agent 5 → scientific validation

Consensus voting
    ↓
Final verdict
```

---

# Core Engineering Advice

The system succeeds based on:
- trustworthy ingestion,
- retrieval quality,
- reranking quality,
- reasoning quality,
- explainability.

The hardest part is NOT embeddings.

The hardest part is:
- evidence quality,
- contradiction reasoning,
- temporal awareness,
- misinformation resistance.

---

# Final Recommended Architecture

```text
trusted sources
    ↓
ingestion
    ↓
chunking
    ↓
embeddings
    ↓
Qdrant
────────────────────
    ↓
user claim/image
    ↓
OCR (optional)
    ↓
retrieval
    ↓
reranking
    ↓
LLM reasoning
    ↓
truth score
    ↓
response
```

---

# Final Key Insight

Do NOT build:

```text
embedding → classifier
```

Build:

```text
retrieval
   ↓
evidence aggregation
   ↓
reasoning
   ↓
truth confidence
```

That transforms the system from:
- semantic similarity,

into:
- true evidence-based verification.

