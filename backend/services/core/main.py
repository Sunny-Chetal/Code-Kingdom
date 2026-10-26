from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from .db import Base, engine, SessionLocal
from .models import ChallengeSubmissionRecord, CodingQuestionRecord
from .schemas import (
    ChallengeSubmission,
    CodingQuestionCreate,
    CodingQuestionRead,
    CodingQuestionUpdate,
)


@asynccontextmanager
async def lifespan(app: FastAPI):  # Creates any missing tables on startup (until the team sets up Alembic).
    try:
        Base.metadata.create_all(bind=engine)
    except SQLAlchemyError:
        pass  # The health check reports the database as unavailable instead of crashing.
    yield


app = FastAPI(title="Code Kingdom Core Service", lifespan=lifespan)

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


# ---------- Coding questions (administrator question management) ----------

def find_question(session, question_id: int) -> CodingQuestionRecord:  # Loads a question or responds with 404.
    question = session.get(CodingQuestionRecord, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Coding question not found")
    return question


@app.get("/coding-questions", response_model=list[CodingQuestionRead])
def list_questions():  # Returns every stored question, oldest first.
    try:
        with SessionLocal() as session:
            questions = session.scalars(
                select(CodingQuestionRecord).order_by(CodingQuestionRecord.id)
            ).all()
            return [CodingQuestionRead.model_validate(question) for question in questions]
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load the coding questions")


@app.get("/coding-questions/{question_id}", response_model=CodingQuestionRead)
def get_question(question_id: int):  # Returns a single question.
    try:
        with SessionLocal() as session:
            return CodingQuestionRead.model_validate(find_question(session, question_id))
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load the coding question")


@app.post("/coding-questions", status_code=201, response_model=CodingQuestionRead)
def create_question(new_question: CodingQuestionCreate):  # Stores a new question.
    try:
        with SessionLocal.begin() as session:
            question = CodingQuestionRecord(**new_question.model_dump())
            session.add(question)
            session.flush()  # Inserts the record so its ID and timestamps become available.
            session.refresh(question)
            return CodingQuestionRead.model_validate(question)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="A question with this slug already exists")
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not store the coding question")


@app.patch("/coding-questions/{question_id}", response_model=CodingQuestionRead)
def update_question(question_id: int, changes: CodingQuestionUpdate):  # Edits only the fields that were sent.
    try:
        with SessionLocal.begin() as session:
            question = find_question(session, question_id)
            for field, value in changes.model_dump(exclude_unset=True).items():
                if value is not None:
                    setattr(question, field, value)
            session.flush()
            session.refresh(question)
            return CodingQuestionRead.model_validate(question)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="A question with this slug already exists")
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not update the coding question")
