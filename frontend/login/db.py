import psycopg
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from psycopg.rows import dict_row
from pwdlib import PasswordHash
from kingdom_catalog import validate_building

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
                gold INT DEFAULT 0,
                gems INT DEFAULT 0,
                wood INT DEFAULT 0,
                buildings VARCHAR(40)[] DEFAULT '{}',
                minigames VARCHAR(40)[] DEFAULT '{}',
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

def get_kingdom_state(username: str) -> dict[str, dict[str, int] | list[str]]:
    with psycopg.connect(DB_URI, row_factory=dict_row) as conn:
        #Get correct user from the table and check if they exist using username
        user = conn.execute(
            "SELECT username FROM users.login WHERE username = %s",
            (username,)
        ).fetchone()
        if not user:
            raise LookupError(f"User {username} not found")

        #Either create the user's stats if they have none or do nothing in the Stats table
        conn.execute(
            "INSERT INTO users.stats (username) VALUES (%s) ON CONFLICT DO NOTHING",
            (username,)
        )

        #Get resources and saved building identifiers from the same stats row
        state = conn.execute(
            "SELECT gold, gems, wood, COALESCE(buildings, ARRAY[]::VARCHAR(40)[]) AS buildings "
            "FROM users.stats WHERE username = %s",
            (username,)
        ).fetchone()

        if state is None:
            raise RuntimeError(f"Kingdom state for user {username} not found")

        return {
            "resources": {"gold": state["gold"], "gems": state["gems"], "wood": state["wood"]},
            "buildings": state["buildings"],
        }

def save_kingdom_state(username: str, gold: int, gems: int, wood: int, buildings: list[str]) -> dict[str, dict[str, int] | list[str]]:
    if not (type(gold) is int and type(gems) is int and type(wood) is int):
        raise ValueError("Kingdom Resources Are Invalid Types")

    if not (0 <= gold <= 2147483647):
        raise ValueError("Gold Is Out Of Range")

    if not (0 <= gems <= 2147483647):
        raise ValueError("Gems Is Out Of Range")

    if not (0 <= wood <= 2147483647):
        raise ValueError("Wood Is Out Of Range")

    building_validity = validate_building(buildings)

    if building_validity is False:
        raise ValueError("Only One Building Of Each Type Can Be Saved")

    with psycopg.connect(DB_URI, row_factory=dict_row) as conn:
        user = conn.execute(
            "SELECT username FROM users.login WHERE username = %s",
            (username,)
        ).fetchone()
        if not user:
            raise LookupError(f"User {username} not found")

        conn.execute(
            "INSERT INTO users.stats (username) VALUES (%s) ON CONFLICT DO NOTHING",
            (username,)
        )

        #Save resources and current buildings together, leaving other progress unchanged
        state = conn.execute(
            "UPDATE users.stats SET gold = %s, gems = %s, wood = %s, buildings = %s "
            "WHERE username = %s RETURNING gold, gems, wood, buildings",
            (gold, gems, wood, buildings, username)
        ).fetchone()

        if state is None:
            raise RuntimeError(f"Kingdom state for user {username} could not be saved")

        result = {
            "resources": {"gold": state["gold"], "gems": state["gems"], "wood": state["wood"]},
            "buildings": state["buildings"],
        }

    return result
