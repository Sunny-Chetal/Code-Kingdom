from pydantic import BaseModel, Field # Allows FastAPI to check incoming JSON

# Requires an identifying string ID for the challenge, comes from the selected challenge
class ChallengeSubmission(BaseModel):
	challenge_id: str = Field(min_length=1)
	code: str = Field(min_length=1) # Submitted Python source; Field rejects whitespace-only answers