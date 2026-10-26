from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from .db import engine, SessionLocal
from .models import ChallengeSubmissionRecord
from .schemas import ChallengeSubmission

app = FastAPI(title="Code Kingdom Core Service")

@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Database unavailable")

@app.get("/")
def root():
    return {"message": "Code Kingdom API is running"}

@app.post("/challenge-submissions", status_code=201)
def submit_answer(submission: ChallengeSubmission):  # Validates and stores a submitted answer.
    if not submission.challenge_id.strip():
        raise HTTPException(status_code=422, detail="A challenge ID is required")

    if not submission.code.strip():
        raise HTTPException(status_code=422, detail="An answer is required")

    try:
        # Commit the submission on success or roll back if a database operation fails.
        with SessionLocal.begin() as session:
            record = ChallengeSubmissionRecord(
                challenge_id=submission.challenge_id.strip(),
                code=submission.code,
            )

            session.add(record)  # Adds the submission to the database transaction.
            session.flush()  # Inserts the record so its generated ID becomes available.
            submission_id = record.id

        return {
            "submission_id": submission_id,
            "status": "submitted",
        }
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not store the submission",
        )