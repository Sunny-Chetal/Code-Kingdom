from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field  # Allows FastAPI to check incoming JSON

# Requires an identifying string ID for the challenge, comes from the selected challenge
class ChallengeSubmission(BaseModel):
    challenge_id: str = Field(min_length=1)
    code: str = Field(min_length=1)  # Submitted Python source; Field rejects whitespace-only answers


Difficulty = Literal["easy", "medium", "hard"]  # The only difficulty levels allowed.


# Fields an administrator fills in when creating a coding question.
class CodingQuestionCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")  # Lowercase letters, numbers and hyphens.
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    starter_code: str = ""
    checks: dict[str, Any] = Field(default_factory=dict)
    difficulty: Difficulty = "easy"
    tier: int = Field(default=1, ge=1, le=100)  # Progression order: tier 1 comes first.


# Every field is optional when editing, so only the changed fields need to be sent.
class CodingQuestionUpdate(BaseModel):
    slug: str | None = Field(default=None, min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1)
    starter_code: str | None = None
    checks: dict[str, Any] | None = None
    difficulty: Difficulty | None = None
    tier: int | None = Field(default=None, ge=1, le=100)


# What the API sends back for a stored question.
class CodingQuestionRead(CodingQuestionCreate):
    model_config = ConfigDict(from_attributes=True)  # Allows building this from a database record.

    id: int
    reward: int  # Gold earned for solving the question.
    created_at: datetime
    updated_at: datetime


# The questions a student sees at their current progression level.
class ProgressionRead(BaseModel):
    level: int  # The tier the student is currently working through.
    all_completed: bool  # True when every question in every tier is completed.
    questions: list[CodingQuestionRead]
