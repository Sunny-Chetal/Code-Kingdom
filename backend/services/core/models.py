from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class ChallengeSubmissionRecord(Base): # Defines a submission table using the shared database base.
	__tablename__ = "challenge_submissions" # Table name in PostgreSQL.

	id: Mapped[int] = mapped_column(primary_key=True) # Automatically generated submission ID.
	challenge_id: Mapped[str] = mapped_column(String, nullable=False) # Challenge being answered.
	code: Mapped[str] = mapped_column(Text, nullable=False) # Submitted code, including indentation.

	# PostgreSQL supplies the submission timestamp when the record is inserted.
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True),
		server_default=func.now(),
		nullable=False,
	)