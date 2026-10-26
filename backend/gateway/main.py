import os
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.core.schemas import ChallengeSubmission, CodingQuestionCreate, CodingQuestionUpdate

load_dotenv()

app = FastAPI(title="Code Kingdom API Gateway")
CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://127.0.0.1:8001")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173",
                   "http://127.0.0.1:4173", ],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "gateway"}

@app.get("/api/health")
async def core_health():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{CORE_SERVICE_URL}/health")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Core service unavailable")

@app.post("/api/challenge-submissions", status_code=201)
async def submit_answer(submission: ChallengeSubmission):  # Forwards answers to the core service.
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{CORE_SERVICE_URL}/challenge-submissions",
                json=submission.model_dump(),
            )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Core service unavailable",
        )

    if response.is_error:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.json().get("detail", "Could not submit the answer"),
        )

    return response.json()


# ---------- Coding questions: forwarded unchanged to the core service ----------

async def forward_to_core(method: str, path: str, payload: dict | None = None):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.request(method, f"{CORE_SERVICE_URL}{path}", json=payload)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Core service unavailable")

    if response.is_error:
        try:
            detail = response.json().get("detail", "Coding question request failed")
        except ValueError:
            detail = "Coding question request failed"
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response.json()


@app.get("/api/coding-questions")
async def list_questions():
    return await forward_to_core("GET", "/coding-questions")


@app.get("/api/coding-questions/{question_id}")
async def get_question(question_id: int):
    return await forward_to_core("GET", f"/coding-questions/{question_id}")


@app.post("/api/coding-questions", status_code=201)
async def create_question(new_question: CodingQuestionCreate):
    return await forward_to_core("POST", "/coding-questions", new_question.model_dump())


@app.patch("/api/coding-questions/{question_id}")
async def update_question(question_id: int, changes: CodingQuestionUpdate):
    return await forward_to_core("PATCH", f"/coding-questions/{question_id}", changes.model_dump(exclude_unset=True))
