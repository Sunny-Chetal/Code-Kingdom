import psycopg
from psycopg.rows import dict_row
from pwdlib import PasswordHash

# Uses 127.0.0.1 (avoids IPv6 timeout) and matches the project's Docker credentials
DB_URI = "postgresql://codekingdom:localdevonly@127.0.0.1:5432/codekingdom"
hasher = PasswordHash.recommended()

def init_db():
    with psycopg.connect(DB_URI) as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS users;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users.login(
                username VARCHAR(255) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users.stats(
                username VARCHAR(255) PRIMARY KEY,
                health INT DEFAULT 100,
                power INT DEFAULT 100,
                FOREIGN KEY (username) REFERENCES users.login(username)
            );
        """)

def get_user_by_username(username: str):
    with psycopg.connect(DB_URI, row_factory=dict_row) as conn:
        user = conn.execute(
            "SELECT * FROM users.login WHERE username = %s",
            (username,)
        ).fetchone()
        if user:
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

def verify_password(user, password: str) -> bool:
    if not user or not user.get("password"):
        return False
    return hasher.verify(password, user["password"])