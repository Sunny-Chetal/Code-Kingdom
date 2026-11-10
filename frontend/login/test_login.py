import uuid
import pytest
import psycopg
from psycopg.rows import dict_row
from fastapi.testclient import TestClient

import db
from login import app, validate_password

client = TestClient(app)

# =========================================================
# 1. Unit Tests: Password & Input Validation Logic
# =========================================================

def test_password_too_short():
    assert validate_password("Ab1") == "Password must be at least 8 characters long."

def test_password_missing_letter():
    assert validate_password("12345678") == "Password must contain at least one letter."

def test_password_missing_number():
    assert validate_password("abcdefgh") == "Password must contain at least one number."

def test_password_too_common():
    assert validate_password("password123") == "This password is too common. Please choose a stronger password."

def test_password_length_boundary():
    # 7 characters (just under limit)
    assert validate_password("Abcde1!") == "Password must be at least 8 characters long."
    # 8 characters (exact minimum valid length)
    assert validate_password("Abcdef1!") is None

def test_valid_password():
    assert validate_password("SecurePass99!") is None


# =========================================================
# 2. Database Operations & Table Constraints
# =========================================================

def test_db_create_and_verify_user():
    unique_user = f"user_{uuid.uuid4().hex[:6]}"
    unique_email = f"{unique_user}@example.com"
    raw_password = "SecretPassword1"

    # Creation succeeds
    assert db.create_user(unique_user, raw_password, unique_email) is True

    # Retrieval check
    user = db.get_user_by_username(unique_user)
    assert user is not None
    assert user["username"] == unique_user
    assert user["email"] == unique_email
    assert user["role"] == "Student"

    # Password hash verification
    assert db.verify_password(user, raw_password) is True
    assert db.verify_password(user, "WrongPassword2") is False

def test_db_prevent_duplicate_username():
    unique_user = f"dup_{uuid.uuid4().hex[:6]}"
    email_a = f"{unique_user}_a@example.com"
    email_b = f"{unique_user}_b@example.com"

    assert db.create_user(unique_user, "ValidPass1", email_a) is True
    # Reusing the exact same username must be rejected by UniqueViolation
    assert db.create_user(unique_user, "ValidPass1", email_b) is False

def test_db_prevent_duplicate_email():
    user_a = f"user_{uuid.uuid4().hex[:6]}"
    user_b = f"user_{uuid.uuid4().hex[:6]}"
    shared_email = f"shared_{uuid.uuid4().hex[:6]}@example.com"

    assert db.create_user(user_a, "ValidPass1", shared_email) is True
    # Reusing the exact same email must be rejected by PostgreSQL UNIQUE constraint
    assert db.create_user(user_b, "ValidPass1", shared_email) is False

def test_db_user_stats_initialized():
    unique_user = f"hero_{uuid.uuid4().hex[:6]}"
    unique_email = f"{unique_user}@example.com"
    db.create_user(unique_user, "ValidPass1", unique_email)

    with psycopg.connect(db.DB_URI, row_factory=dict_row) as conn:
        stats = conn.execute(
            "SELECT * FROM users.stats WHERE username = %s",
            (unique_user,)
        ).fetchone()

    assert stats is not None
    assert stats["health"] == 100
    assert stats["power"] == 100


# =========================================================
# 3. HTTP Endpoints, Cookies & Session Flow
# =========================================================

def test_get_pages():
    login_res = client.get("/login")
    signup_res = client.get("/signup")
    assert login_res.status_code == 200
    assert "Sign in to your account" in login_res.text
    assert signup_res.status_code == 200
    assert "Join Code Kingdom" in signup_res.text

def test_signup_validation_rejections():
    # Rejects purely numeric usernames
    res_num = client.post(
        "/signup",
        data={"username": "12345678", "email": "num@test.com", "password": "ValidPass1"},
        follow_redirects=False,
    )
    assert "Username cannot be just numbers" in res_num.text

    # Rejects invalid characters
    res_chars = client.post(
        "/signup",
        data={"username": "invalid user!", "email": "chars@test.com", "password": "ValidPass1"},
        follow_redirects=False,
    )
    assert "Username can only contain letters, numbers, and underscores" in res_chars.text

def test_unauthenticated_dashboard_redirect():
    response = client.get("/dashboard", follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"] == "/login"

def test_full_login_and_logout_flow():
    test_user = f"player_{uuid.uuid4().hex[:6]}"
    test_email = f"{test_user}@test.com"
    test_pwd = "KingdomPass2026"

    # Sign up via form submission
    signup_res = client.post(
        "/signup",
        data={"username": test_user, "email": test_email, "password": test_pwd},
        follow_redirects=False,
    )
    assert signup_res.status_code == 303
    assert signup_res.headers["location"] == "/dashboard"

    # Sign in
    login_res = client.post(
        "/login",
        data={"username": test_user, "password": test_pwd},
        follow_redirects=False,
    )
    assert login_res.status_code == 303
    assert "session" in login_res.cookies

    # Access protected dashboard
    dashboard_res = client.get("/dashboard", cookies=login_res.cookies)
    assert dashboard_res.status_code == 200
    assert test_user in dashboard_res.text
    assert "Student" in dashboard_res.text

    # Logout
    logout_res = client.get("/logout", cookies=login_res.cookies, follow_redirects=False)
    assert logout_res.status_code == 303
    assert logout_res.headers["location"] == "/login"