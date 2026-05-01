# Truth Verification System V1 — Full VSCode Setup & Implementation Guide

This guide gives you a complete workflow to build your first multimodal truth verification application inside VSCode.

---

# 1. Install Required Software

## Install VSCode
Download:
- https://code.visualstudio.com/

Recommended extensions:
- Python
- Pylance
- Docker
- Thunder Client
- GitLens

---

# 2. Install Python

Install Python 3.11+

Check:

```bash
python --version
```

---

# 3. Install Docker

Download:
- https://www.docker.com/products/docker-desktop/

Check:

```bash
docker --version
```

---

# 4. Create the Project Folder

Open VSCode.

Open terminal:

```bash
mkdir truth-verifier
cd truth-verifier
```

Open inside VSCode:

```bash
code .
```

---

# 5. Create Virtual Environment

Inside VSCode terminal:

## Windows

```bash
python -m venv venv
venv\Scripts\activate
```

## Mac/Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

---

# 6. Create Project Structure

Create folders:

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

# 7. Create requirements.txt

Create file:

```text
requirements.txt
```

Paste:

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

# 8. Setup Docker Services

Create:

```text
docker-compose.yml
```

Paste:

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

Verify:

```bash
docker ps
```

---

# 9. Create Embedding Module

Create:

```text
app/embeddings/embedder.py
```

Paste:

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

# 10. Create Qdrant Database Module

Create:

```text
app/database/qdrant.py
```

Paste:

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


def create_collection():

    collections = client.get_collections()

    existing = [
        c.name
        for c in collections.collections
    ]

    if COLLECTION_NAME not in existing:

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=1024,
                distance=Distance.COSINE
            )
        )

        print("Collection created")

    else:
        print("Collection already exists")
```

---

# 11. Create Database Initialization Script

Create:

```text
app/database/init_db.py
```

Paste:

```python
from app.database.qdrant import create_collection

create_collection()
```

Run:

```bash
python -m app.database.init_db
```

---

# 12. Create News Ingestion Pipeline

Create:

```text
app/ingestion/news_ingestion.py
```

Paste:

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


def ingest_news():

    for url in RSS_FEEDS:

        feed = feedparser.parse(url)

        for entry in feed.entries:

            title = entry.title
            summary = entry.summary

            text = f"{title} {summary}"

            embedding = create_embedding(text)

            client.upsert(
                collection_name=COLLECTION_NAME,
                points=[
                    {
                        "id": str(uuid.uuid4()),
                        "vector": embedding,
                        "payload": {
                            "title": title,
                            "content": summary,
                            "source": "Reuters",
                            "url": entry.link
                        }
                    }
                ]
            )

            print(f"Stored: {title}")


if __name__ == "__main__":
    ingest_news()
```

Run:

```bash
python -m app.ingestion.news_ingestion
```

---

# 13. Create Retrieval System

Create:

```text
app/retrieval/search.py
```

Paste:

```python
from app.embeddings.embedder import create_embedding
from app.database.qdrant import (
    client,
    COLLECTION_NAME
)

SOURCE_WEIGHTS = {
    "Reuters": 0.98,
    "AP": 0.97,
    "Wikipedia": 0.75
}


def search_claim(claim: str):

    embedding = create_embedding(claim)

    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=embedding,
        limit=5
    )

    reranked = []

    for r in results:

        credibility = SOURCE_WEIGHTS.get(
            r.payload.get("source", ""),
            0.5
        )

        final_score = r.score * credibility

        reranked.append(
            (final_score, r)
        )

    reranked.sort(
        reverse=True,
        key=lambda x: x[0]
    )

    return reranked
```

---

# 14. Create Reasoning Layer

Create:

```text
app/reasoning/verifier.py
```

Paste:

```python
import os

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def verify_claim(claim, evidence):

    evidence_text = "\n\n".join([
        e.payload["content"]
        for _, e in evidence
    ])

    prompt = f"""
You are a fact verification system.

Claim:
{claim}

Evidence:
{evidence_text}

Return:
1. verdict
2. confidence score
3. reasoning
4. supporting evidence

Labels:
- verified true
- likely true
- misleading
- false
- unverifiable
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content
```

---

# 15. Create Environment Variables

Create:

```text
.env
```

Paste:

```env
OPENAI_API_KEY=YOUR_API_KEY
```

---

# 16. Create FastAPI Endpoint

Create:

```text
app/api/routes.py
```

Paste:

```python
from fastapi import FastAPI
from pydantic import BaseModel

from app.retrieval.search import search_claim
from app.reasoning.verifier import verify_claim

app = FastAPI()


class ClaimRequest(BaseModel):
    claim: str


@app.post("/verify")
def verify(request: ClaimRequest):

    results = search_claim(
        request.claim
    )

    verdict = verify_claim(
        request.claim,
        results
    )

    evidence = []

    for _, r in results:

        evidence.append({
            "title": r.payload.get("title"),
            "content": r.payload.get("content"),
            "source": r.payload.get("source"),
            "url": r.payload.get("url")
        })

    return {
        "claim": request.claim,
        "verdict": verdict,
        "evidence": evidence
    }
```

---

# 17. Create Main Entry File

Create:

```text
main.py
```

Paste:

```python
from app.api.routes import app
```

---

# 18. Run the API

Inside terminal:

```bash
uvicorn main:app --reload
```

API will run:

```text
http://localhost:8000
```

Swagger docs:

```text
http://localhost:8000/docs
```

---

# 19. Test the API

Inside Swagger:

POST:

```text
/verify
```

Request:

```json
{
  "claim": "Floods happened in Hyderabad today"
}
```

---

# 20. Add OCR Support

Create:

```text
app/utils/ocr.py
```

Paste:

```python
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True)


def extract_text(image_path):

    result = ocr.ocr(image_path)

    texts = []

    for line in result[0]:
        texts.append(line[1][0])

    return " ".join(texts)
```

---

# 21. Add Image Verification Endpoint

Future flow:

```text
image
  ↓
OCR
  ↓
extract text
  ↓
retrieve evidence
  ↓
LLM reasoning
  ↓
verdict
```

---

# 22. Add Elasticsearch Hybrid Search

Future improvement:

```text
semantic search
+
BM25 keyword search
```

This greatly improves:
- names
- dates
- exact entities
- quotes

---

# 23. Add Reverse Image Search (V2)

Future improvement:

Use:
- SigLIP2
- CLIP
- image nearest-neighbor search

To detect:
- reused images
- manipulated context
- misinformation

---

# 24. Recommended Production Improvements

## Add:
- Redis
- Celery
- background workers
- source trust scoring
- timestamp filtering
- multilingual support
- metadata analysis
- deepfake detection

---

# 25. Recommended Next Milestones

## V1
- text verification
- image OCR
- trusted retrieval
- LLM reasoning

## V2
- reverse image search
- hybrid retrieval
- multilingual support

## V3
- video verification
- audio verification
- deepfake detection
- social propagation analysis

---

# 26. Final Architecture

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

# 27. Recommended Open Source Models

| Task | Model |
|---|---|
| Text embeddings | BGE-large |
| Image embeddings | SigLIP2 |
| OCR | PaddleOCR |
| Reasoning | Qwen2.5-VL |
| Reranking | BGE-reranker |

---

# 28. Important Engineering Advice

Do NOT focus on training a giant classifier first.

Your biggest gains come from:
- trustworthy ingestion
- high-quality retrieval
- reranking
- explainable reasoning
- source credibility

That is how modern verification systems succeed.

