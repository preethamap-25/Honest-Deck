# Honest Deck Model Service

Local RAG service for evidence-based truth verification.

## What It Does

The model service verifies a claim by:

1. ingesting trusted source documents,
2. embedding them into Qdrant,
3. retrieving relevant evidence for a user claim,
4. reranking evidence by source credibility,
5. asking a local LLM to reason only over retrieved evidence,
6. returning a verdict, confidence score, reasoning, limitations, and evidence.

## Local Setup

```powershell
cd D:\Projects\Honest-Deck\model
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Image OCR is optional because PaddleOCR has a large dependency tree on Windows:

```powershell
pip install -r requirements-ocr.txt
```

For the local reasoning model, install and run Ollama:

```powershell
ollama pull llama3.1:8b
ollama serve
```

Start infrastructure:

```powershell
docker compose up -d
python -m app.database.init_db
python -m app.ingestion.news_ingestion
```

Run the API:

```powershell
uvicorn main:app --reload --port 8001
```

Smoke test:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health

Invoke-RestMethod `
  -Uri http://127.0.0.1:8001/verify `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"claim":"Your claim here"}'
```

## Testing

The automated tests mock external services, so they do not require Qdrant, Ollama,
PaddleOCR, RSS feeds, or model downloads.

```powershell
cd D:\Projects\Honest-Deck\model
pytest
```

## Accuracy Checks

Use a small hand-labeled benchmark before frontend integration:

- true claims,
- false claims,
- misleading claims,
- current-news claims,
- claims that should be unverifiable.

Score each result for:

- retrieval relevance,
- verdict correctness,
- source quality,
- explanation quality,
- correct use of `unverifiable` when evidence is weak.

The most important behavior is caution: the system should not give confident
verdicts when the local evidence index does not support them.
