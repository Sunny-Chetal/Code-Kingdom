from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class ChallengeSubmissionRecord(Base):  # Defines a submission table using the shared database base.
    __tablename__ = "challenge_submissions"  # Table name in PostgreSQL.

    id: Mapped[int] = mapped_column(primary_key=True)  # Automatically generated submission ID.
    challenge_id: Mapped[str] = mapped_column(String, nullable=False)  # Challenge being answered.
    code: Mapped[str] = mapped_column(Text, nullable=False)  # Submitted code, including indentation.

    # PostgreSQL supplies the submission timestamp when the record is inserted.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# Gold a student earns for solving a question at each difficulty level.
DIFFICULTY_REWARDS = {
    "easy": 25,
    "medium": 50,
    "hard": 100,
}


class CodingQuestionRecord(Base):  # Stores the coding questions administrators manage.
    __tablename__ = "coding_questions"  # Table name in PostgreSQL.

    id: Mapped[int] = mapped_column(primary_key=True)  # Automatically generated question ID.
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # Readable ID, e.g. "variables-challenge".
    title: Mapped[str] = mapped_column(String(200), nullable=False)  # Question name shown to students.
    description: Mapped[str] = mapped_column(Text, nullable=False)  # Instructions for the student.
    starter_code: Mapped[str] = mapped_column(Text, nullable=False, default="")  # Code pre-filled in the editor.
    checks: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)  # Rules used to grade an answer.
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="easy")  # easy, medium or hard.

    # PostgreSQL supplies the timestamps; updated_at changes whenever the question is edited.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    @property
    def reward(self) -> int:  # Gold earned for this question, based on its difficulty.
        return DIFFICULTY_REWARDS[self.difficulty]
