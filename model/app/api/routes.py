import os
import shutil
import tempfile

from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel, Field

from app.reasoning.verifier import verify_claim
from app.retrieval.search import search_claim

app = FastAPI(title="Truth Verification System V1")


class ClaimRequest(BaseModel):
    claim: str = Field(..., min_length=1)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/verify")
def verify(request: ClaimRequest):
    return verify_text_claim(request.claim)


@app.post("/verify-image")
def verify_image(file: UploadFile = File(...)):
    from app.utils.ocr import extract_text

    suffix = os.path.splitext(file.filename or "")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_path = temp_file.name

    try:
        extracted_text = extract_text(temp_path)
        result = verify_text_claim(extracted_text)
        result["extracted_text"] = extracted_text
        return result
    finally:
        os.remove(temp_path)


def verify_text_claim(claim: str):
    claim = claim.strip()
    results = search_claim(claim)
    verdict = verify_claim(claim, results)

    evidence = [
        {
            "title": (r.payload or {}).get("title"),
            "content": (r.payload or {}).get("content"),
            "source": (r.payload or {}).get("source"),
            "url": (r.payload or {}).get("url"),
            "similarity_score": r.score,
            "weighted_score": final_score,
        }
        for final_score, r in results
    ]

    return {
        "claim": claim,
        "verdict": verdict,
        "evidence": evidence,
    }
