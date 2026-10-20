import os
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="Code Kingdom API Gateway")
CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://127.0.0.1:8001")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173",],
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
