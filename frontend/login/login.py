import os
import re
from html import escape

from dotenv import load_dotenv
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

import db
from oauth import router as oauth_router

load_dotenv()

app = FastAPI()
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev-only-change-me"),
    same_site="lax",
    https_only=False,  
)
app.include_router(oauth_router)

db.init_db()

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]+$")

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
        button {{ width: 100%; margin-top: 16px; padding: 12px; border: 0;
            border-radius: 8px; background: #315efb; color: white;
            font: inherit; font-weight: 700; cursor: pointer; }}
        button:hover {{ background: #244bd1; }}
        .oauth-btn {{ background: #fff; color: #172033; border: 1px solid #d0d5dd; margin-top: 10px;
            display: flex; align-items: center; justify-content: center; gap: 10px; }}
        .oauth-btn:hover {{ background: #f9fafb; }}
        .oauth-btn svg {{ width: 20px; height: 20px; }}
        .notice {{ padding: 12px; margin-bottom: 16px; border-radius: 8px; background: #fff4e5; color: #8a4b08; }}
        .footer-link {{ margin-top: 24px; text-align: center; font-size: 0.95rem; }}
        a {{ color: #315efb; text-decoration: none; font-weight: 600; }}
        a:hover {{ text-decoration: underline; }}
        .divider {{ margin: 20px 0; text-align: center; color: #667085; font-size: 0.85rem; }}
        .oauth-forms {{ display: flex; flex-direction: column; }}
    </style>
</head>
<body>
    <main>
        {content}
    </main>
</body>
</html>"""

OAUTH_BUTTONS = """
<form class="oauth-forms" action="/oauth_login" method="post">
    <button class="oauth-btn" type="submit" name="provider" value="google">
        <svg viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.82 7.18l7.73 6c4.51-4.18 7.13-10.36 7.13-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google
    </button>
    <button class="oauth-btn" type="submit" name="provider" value="github">
        <svg viewBox="0 0 24 24">
            <path fill="#181717" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
        Continue with GitHub
    </button>
</form>
"""

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
        <div class="divider">— OR —</div>
        {OAUTH_BUTTONS}
        <div class="footer-link">
            <span>Don't have an account? </span>
            <a href="/signup">Sign up here!</a>
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
            
            
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="new-password" required>
            <button type="submit">Sign up</button>
        </form>
        <div class="divider">— OR —</div>
        {OAUTH_BUTTONS}
        <div class="footer-link">
            <span>Already have an account? </span>
            <a href="/login">Sign in</a>
        </div>
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

    if not db.create_user(username, password, email):
        return HTMLResponse(render_signup("This username is already taken, please choose another one."))

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
        <p>Your game dashboard will go here.</p>
        <div class="footer-link">
            <a href="/logout">Log out</a>
        </div>
    """
    return render_base_page(content)

@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=303)