# Tests for the coding questions feature. Run from the backend folder with:  python -m pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from services.core.db import SessionLocal
from services.core.main import app
from services.core.models import CodingQuestionRecord

client = TestClient(app)

QUESTION = {
    "slug": "test-gold-question",
    "title": "Store Some Gold",
    "description": "Create a variable named gold with a value of 100, then print it.",
    "starter_code": "",
    "checks": {"variables": {"gold": 100}, "output": "100"},
    "difficulty": "medium",
}


def remove_test_questions():  # Deletes questions created by these tests so every run starts clean.
    with SessionLocal.begin() as session:
        session.execute(delete(CodingQuestionRecord).where(CodingQuestionRecord.slug.startswith("test-")))


def setup_function():
    with client:  # Starting the app creates the tables if they are missing.
        remove_test_questions()


teardown_function = setup_function


def store_question(**overrides):  # Saves a question straight to the database and returns its ID.
    with SessionLocal.begin() as session:
        question = CodingQuestionRecord(**{**QUESTION, **overrides})
        session.add(question)
        session.flush()
        return question.id


def test_questions_are_stored_in_the_database():  # CK-17
    question_id = store_question()
    with SessionLocal() as session:
        stored = session.get(CodingQuestionRecord, question_id)
        assert stored.slug == QUESTION["slug"]
        assert stored.checks == QUESTION["checks"]
        assert stored.difficulty == "medium"
        assert stored.created_at is not None
