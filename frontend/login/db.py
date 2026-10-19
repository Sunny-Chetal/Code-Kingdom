import sqlite3
from contextlib import contextmanager
from pathlib import Path

from pwdlib import PasswordHash

DB_PATH = Path(__file__).parent / "users.db"
password_hasher = PasswordHash.recommended()

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                username       TEXT NOT NULL UNIQUE,
                password_hash  TEXT NOT NULL,               
                role           TEXT NOT NULL DEFAULT 'Student',
                email          TEXT NOT NULL,
                created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

def get_user_by_username(username: str) -> sqlite3.Row | None:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()

def create_user(username: str, password: str, email: str) -> bool:
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, 'Student')",
                (username, password_hasher.hash(password), email),
            )
        return True
    except sqlite3.IntegrityError:
        return False

def verify_password(user: sqlite3.Row, password: str) -> bool:
    return password_hasher.verify(password, user["password_hash"])