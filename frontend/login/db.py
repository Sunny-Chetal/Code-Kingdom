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
                password_hash  TEXT,               
                role           TEXT NOT NULL DEFAULT 'Student',
                oauth_provider TEXT,
                oauth_id       TEXT,
                email          TEXT,
                created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth
            ON users (oauth_provider, oauth_id)
            WHERE oauth_provider IS NOT NULL
            """
        )

def get_user_by_username(username: str) -> sqlite3.Row | None:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()

def get_user_by_oauth(provider: str, oauth_id: str) -> sqlite3.Row | None:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?",
            (provider, oauth_id),
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

def create_oauth_user(
    provider: str, oauth_id: str, preferred_name: str, email: str | None
) -> sqlite3.Row:
    base = f"{provider}_{preferred_name}".replace(" ", "")
    username, n = base, 1
    while get_user_by_username(username):
        n += 1
        username = f"{base}{n}"
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (username, oauth_provider, oauth_id, email, role) "
            "VALUES (?, ?, ?, ?, 'Student')",
            (username, provider, oauth_id, email),
        )
    return get_user_by_username(username)

def verify_password(user: sqlite3.Row, password: str) -> bool:
    if not user["password_hash"]:  
        return False
    return password_hasher.verify(password, user["password_hash"])