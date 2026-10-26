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


# What the API sends back for a stored question.
class CodingQuestionRead(CodingQuestionCreate):
    model_config = ConfigDict(from_attributes=True)  # Allows building this from a database record.

    id: int
    created_at: datetime
    updated_at: datetime
