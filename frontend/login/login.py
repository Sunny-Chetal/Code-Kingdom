import email
import os
import re
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from html import escape
from email.message import EmailMessage
import ssl

from dotenv import load_dotenv
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware


import db

load_dotenv(override=True)
import resend


resend.api_key = os.getenv("RESEND_API_KEY")



app = FastAPI()
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET") or "dev-only-change-me",
    same_site="lax",
    https_only=False,  
)

db.init_db()

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]+$")
GAME_URL = os.getenv("GAME_DASHBOARD_URL", "http://localhost:5173")

# Temporary in-memory store for tokens. 
# For production, move this to your PostgreSQL database to persist across server restarts.
RESET_TOKENS = {}




def validate_password(password: str) -> str | None:
    """Returns an error message if the password fails requirements, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not re.search(r"[A-Za-z]", password):
        return "Password must contain at least one letter."
    if not re.search(r"\d", password):
        return "Password must contain at least one number."
    if password.strip() in {"12345678", "password", "password123", "admin123"}:
        return "This password is too common. Please choose a stronger password."
    return None


def render_base_page(content: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * {{ box-sizing: border-box; }}
        body {{ min-height: 100vh; margin: 0; padding: 24px; display: grid;
            place-items: center; background: #f3f5f9; color: #172033;
            font: 16px/1.5 system-ui, sans-serif; }}
        main {{ width: min(100%, 420px); padding: 36px; border-radius: 16px;
            background: #fff; box-shadow: 0 16px 48px #17203318; }}
        h1 {{ margin: 0 0 8px; font-size: 1.8rem; }}
        .intro {{ margin: 0 0 26px; color: #667085; }}
        label {{ display: block; margin: 18px 0 7px; font-weight: 600; }}
        input {{ width: 100%; padding: 12px 14px; border: 1px solid #d0d5dd;
            border-radius: 8px; font: inherit; }}
        input:focus {{ outline: 3px solid #315efb33; border-color: #315efb; }}
        button, .btn {{ width: 100%; margin-top: 16px; padding: 12px; border: 0;
            border-radius: 8px; background: #315efb; color: white;
            font: inherit; font-weight: 700; cursor: pointer; text-decoration: none;
            display: inline-block; text-align: center; }}
        button:hover, .btn:hover {{ background: #244bd1; }}
        .notice {{ padding: 12px; margin-bottom: 16px; border-radius: 8px; background: #fff4e5; color: #8a4b08; }}
        .footer-link {{ margin-top: 24px; text-align: center; font-size: 0.95rem; display: flex; justify-content: center; gap: 4px; flex-wrap: wrap; }}
        a {{ color: #315efb; text-decoration: none; font-weight: 600; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <main>
        {content}
    </main>
</body>
</html>"""


def render_login(message: str = "") -> str:
    notice = f'<p class="notice" role="status">{escape(message)}</p>' if message else ""
    content = f"""
        <h1>User Portal</h1>
        <p class="intro">Sign in to your account.</p>
        {notice}
        <form action="/login" method="post">
            <label for="username">Username</label>
            <input id="username" name="username" type="text" autocomplete="username" required>
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required>
            <button type="submit">Sign in</button>
        </form>
        <div class="footer-link">
            <span>Don't have an account? </span>
            <a href="/signup"> Sign up here!</a>
            <span>Forgot your password? </span>
            <a href="/reset-password"> Click here to Reset!</a>
        </div>
      
    """
    return render_base_page(content)


def render_signup(message: str = "") -> str:
    notice = f'<p class="notice" role="status">{escape(message)}</p>' if message else ""
    content = f"""
        <h1>User Portal</h1>
        <p class="intro">Join Code Kingdom to start your adventure.</p>
        {notice}
        <form action="/signup" method="post">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="email" required>    

            <label for="username">Username (letters, numbers, and underscores)</label>
            <input id="username" name="username" type="text" autocomplete="username" required>
            
            <label for="password">Password (min 8 chars, letters & numbers)</label>
            <input id="password" name="password" type="password" autocomplete="new-password" required>
            <button type="submit">Sign up</button>
        </form>
        <div class="footer-link">
            <span>Already have an account? </span>
            <a href="/login">Sign in</a>
        </div>
    """
    return render_base_page(content)


def render_reset_password(message: str = "") -> str:
    notice = f'<p class="notice" role="status">{escape(message)}</p>' if message else ""
    content = f"""
        <h1>Reset Password</h1>
        <p class="intro">Enter your email to receive a reset link.</p>
        {notice}
        <form action="/reset-password" method="post">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="email" required>
            <button type="submit">Send Reset Link</button>
        </form>
        <div class="footer-link">
            <span>Remembered your password? </span>
            <a href="/login">Sign in</a>
        </div>
    """
    return render_base_page(content)


def render_reset_password_confirmation() -> str:
    content = f"""
        <h1>Reset Password</h1>
        <p class="intro">If an account with that email exists, a password reset link has been sent.</p>
        <div class="footer-link">
            <span>Return to </span>
            <a href="/login">Sign in</a>
        </div>
    """
    return render_base_page(content)


def render_new_password_form(token: str, message: str = "") -> str:
    notice = f'<p class="notice" role="status">{escape(message)}</p>' if message else ""
    content = f"""
        <h1>Create New Password</h1>
        <p class="intro">Please enter your new password below.</p>
        {notice}
        <form action="/reset-password-confirm" method="post">
            <input type="hidden" name="token" value="{escape(token)}">
            <label for="password">New Password (min 8 chars, letters & numbers)</label>
            <input id="password" name="password" type="password" autocomplete="new-password" required>
            <button type="submit">Update Password</button>
        </form>
    """
    return render_base_page(content)


@app.get("/", response_class=HTMLResponse)
@app.get("/login", response_class=HTMLResponse)
async def login_form(message: str = ""):
    return render_login(message)


@app.post("/login", response_class=HTMLResponse)
def login(request: Request, username: str = Form(...), password: str = Form(...)):
    user = db.get_user_by_username(username)
    if not user or not db.verify_password(user, password):
        return HTMLResponse(render_login("Invalid username or password."))

    request.session["username"] = user["username"]
    return RedirectResponse(url="/dashboard", status_code=303)


@app.get("/signup", response_class=HTMLResponse)
async def signup_form():
    return render_signup()


@app.post("/signup", response_class=HTMLResponse)
def signup(request: Request, username: str = Form(...), email: str = Form(...), password: str = Form(...)):
    if username.isdigit():
        return HTMLResponse(render_signup("Username cannot be just numbers. Please include at least one letter."))
    if not USERNAME_RE.match(username):
        return HTMLResponse(render_signup("Username can only contain letters, numbers, and underscores."))

    # Validate custom password requirements
    pwd_error = validate_password(password)
    if pwd_error:
        return HTMLResponse(render_signup(pwd_error))

    if not db.create_user(username, password, email):
        return HTMLResponse(render_signup("This username or email is already taken, please choose another one."))

    request.session["username"] = username
    return RedirectResponse(url="/dashboard", status_code=303)


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request):
    username = request.session.get("username")
    user = db.get_user_by_username(username) if username else None
    if not user:
        request.session.clear()
        return RedirectResponse(url="/login", status_code=303)

    content = f"""
        <h1>Kingdom Dashboard</h1>
        <p class="intro">Welcome back, <strong>{escape(user["username"])}</strong>!</p>
        <p><strong>Role:</strong> {escape(user["role"])}</p>
        
        <div style="margin: 28px 0 16px;">
            <a class="btn" href="{GAME_URL}">Enter Code Kingdom Game &rarr;</a>
        </div>

        <div class="footer-link">
            <a href="/logout">Log out</a>
        </div>
    """
    return render_base_page(content)


@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=303)


# --- Password Reset Flow ---

@app.get("/reset-password", response_class=HTMLResponse)
async def reset_password_form(message: str = ""):
    return HTMLResponse(render_reset_password(message))



@app.post("/reset-password", response_class=HTMLResponse)
def handle_reset_password(email: str = Form(...)):
    print(f"--- DEBUG: Received reset request for: '{email}' ---")
    
    user = db.get_user_by_email(email)
    
    if user:
        token = secrets.token_urlsafe(32)
        RESET_TOKENS[token] = {
            "email": email,
            "expires": datetime.now(timezone.utc) + timedelta(minutes=15)
        }
        
        reset_link = f"http://localhost:8003/reset-password-confirm?token={token}"
        print(f"--- DEBUG: Reset Link: {reset_link} ---")
        
        # Ensure API key is loaded
        resend.api_key = os.getenv("RESEND_API_KEY")
        if not resend.api_key:
            print("--- ERROR: RESEND_API_KEY is None! Check frontend/login/.env ---")
        
        try:
            params = {
                "from": "Acme <onboarding@resend.dev>",
                "to": [email],
                "subject": "Code Kingdom Password Reset",
                "html": f"<strong>Click the link bellow to reset your password:</strong> <br><br> <a href='{reset_link}'>{reset_link}</a>"
            }
            
            email_response = resend.Emails.send(params)
            print(f"--- SUCCESS: Email sent via Resend! ID: {email_response['id']} ---")
        except Exception as e:
            print(f"--- ERROR: Resend API failed. Details: {e} ---")
            
    else:
        print(f"--- WARNING: No user found in DB for email {email}. Skipping email send. ---")

    return HTMLResponse(render_reset_password_confirmation())


@app.get("/reset-password-confirm", response_class=HTMLResponse)
async def confirm_reset_password_get(token: str):
    record = RESET_TOKENS.get(token)
    
    # Check if token exists and hasn't expired
    if not record or datetime.now(timezone.utc) > record["expires"]:
        return HTMLResponse(render_reset_password("Invalid or expired reset link. Please request a new one."))



    return HTMLResponse(render_new_password_form(token))


@app.post("/reset-password-confirm", response_class=HTMLResponse)
def confirm_reset_password_post(token: str = Form(...), password: str = Form(...)):
    record = RESET_TOKENS.get(token)
    
    if not record or datetime.now(timezone.utc) > record["expires"]:
        return HTMLResponse(render_reset_password("Invalid or expired reset link."))

    # Re-use existing validation logic
    pwd_error = validate_password(password)
    if pwd_error:
        return HTMLResponse(render_new_password_form(token, pwd_error))

    # Update password in DB
    db.update_user_password(record["email"], password)
    
    # Invalidate token so it can't be reused
    del RESET_TOKENS[token]

    return HTMLResponse(render_login("Password successfully updated. Please sign in."))

