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


def test_lists_and_displays_questions():  # CK-13
    question_id = store_question()
    with client:
        listed = client.get("/coding-questions")
        assert listed.status_code == 200
        assert question_id in [q["id"] for q in listed.json()]

        single = client.get(f"/coding-questions/{question_id}")
        assert single.json()["title"] == QUESTION["title"]

        assert client.get("/coding-questions/999999").status_code == 404


def test_creates_questions_and_rejects_bad_input():  # CK-14
    with client:
        created = client.post("/coding-questions", json=QUESTION)
        assert created.status_code == 201
        assert created.json()["checks"] == QUESTION["checks"]

        assert client.post("/coding-questions", json=QUESTION).status_code == 409  # Duplicate slug.
        assert client.post("/coding-questions", json={**QUESTION, "slug": "test-x", "difficulty": "impossible"}).status_code == 422
        assert client.post("/coding-questions", json={**QUESTION, "slug": "Has Spaces"}).status_code == 422


def test_edits_only_the_fields_sent():  # CK-15
    question_id = store_question()
    with client:
        edited = client.patch(f"/coding-questions/{question_id}", json={"difficulty": "hard"})
        assert edited.status_code == 200
        assert edited.json()["difficulty"] == "hard"
        assert edited.json()["title"] == QUESTION["title"]  # Unsent fields stay the same.

        assert client.patch("/coding-questions/999999", json={"title": "Nope"}).status_code == 404


def test_deletes_questions():  # CK-16
    question_id = store_question()
    with client:
        assert client.delete(f"/coding-questions/{question_id}").status_code == 204
        assert client.get(f"/coding-questions/{question_id}").status_code == 404
        assert client.delete(f"/coding-questions/{question_id}").status_code == 404
