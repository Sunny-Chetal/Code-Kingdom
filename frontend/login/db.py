import psycopg
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from psycopg.rows import dict_row
from pwdlib import PasswordHash

# Uses 127.0.0.1 (avoids IPv6 timeout) and matches the project's Docker credentials
PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / "backend" / ".env")

DB_URI = (
    make_url(os.environ["DATABASE_URL"])
    .set(drivername="postgresql")
    .render_as_string(hide_password=False)
)

hasher = PasswordHash.recommended()
def init_db():
    with psycopg.connect(DB_URI) as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS users;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users.login(
                username VARCHAR(255) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'Student'
            );
        """)
        conn.execute("""
            ALTER TABLE users.login
                ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'Student';
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users.stats(
                username VARCHAR(255) PRIMARY KEY,
                health INT DEFAULT 100,
                power INT DEFAULT 100,
                tutorials VARCHAR(40)[] NOT NULL DEFAULT '{}',
                FOREIGN KEY (username) REFERENCES users.login(username)
            );
        """)
        # Adds replay progress to databases created before tutorial completion was persisted.
        conn.execute("""
            ALTER TABLE users.stats
                ADD COLUMN IF NOT EXISTS tutorials VARCHAR(40)[] NOT NULL DEFAULT '{}';
        """)

def get_user_by_username(username: str):
    with psycopg.connect(DB_URI, row_factory=dict_row) as conn:
        user = conn.execute(
            "SELECT * FROM users.login WHERE username = %s",
            (username,)
        ).fetchone()
        if user and not user.get("role"):
            user["role"] = "Student"
        return user

def create_user(username: str, password: str, email: str) -> bool:
    try:
        with psycopg.connect(DB_URI) as conn:
            conn.execute(
                "INSERT INTO users.login (username, email, password) VALUES (%s, %s, %s)",
                (username, email, hasher.hash(password))
            )
            conn.execute(
                "INSERT INTO users.stats (username) VALUES (%s) ON CONFLICT DO NOTHING",
                (username,)
            )
        return True
    except psycopg.errors.UniqueViolation:
        return False

def get_completed_tutorial_ids(username: str) -> list[str]:
    with psycopg.connect(DB_URI) as conn:
        row = conn.execute(
            "SELECT COALESCE(tutorials, ARRAY[]::VARCHAR(40)[]) FROM users.stats WHERE username = %s",
            (username,)
        ).fetchone()
        return row[0] if row else []

def mark_tutorial_completed(username: str, tutorial_id: str) -> list[str]:
    # Updates the account's completion array without adding duplicate tutorial IDs.
    with psycopg.connect(DB_URI) as conn:
        row = conn.execute(
            """
            INSERT INTO users.stats AS existing_stats (username, tutorials)
            VALUES (%s, ARRAY[%s]::VARCHAR(40)[])
            ON CONFLICT (username) DO UPDATE
            SET tutorials = CASE
                WHEN EXCLUDED.tutorials[1] = ANY(COALESCE(existing_stats.tutorials, ARRAY[]::VARCHAR(40)[]))
                    THEN COALESCE(existing_stats.tutorials, ARRAY[]::VARCHAR(40)[])
                ELSE array_append(COALESCE(existing_stats.tutorials, ARRAY[]::VARCHAR(40)[]), EXCLUDED.tutorials[1])
            END
            RETURNING COALESCE(tutorials, ARRAY[]::VARCHAR(40)[])
            """,
            (username, tutorial_id)
        ).fetchone()
        return row[0] if row else []

def verify_password(user, password: str) -> bool:
    if not user or not user.get("password"):
        return False
    return hasher.verify(password, user["password"])

def get_user_by_email(email: str):
    with psycopg.connect(DB_URI, row_factory=dict_row) as conn:
        user = conn.execute(
            "SELECT * FROM users.login WHERE email = %s",
            (email,)
        ).fetchone()
        if user and not user.get("role"):
            user["role"] = "Student"
        return user

def update_user_password(username: str, new_password: str) -> bool:
    try:
        with psycopg.connect(DB_URI) as conn:
            conn.execute(
                "UPDATE users.login SET password = %s WHERE username = %s",
                (hasher.hash(new_password), username)
            )
        return True
    except Exception as e:
        print(f"Error updating password for {username}: {e}")
        return False

    