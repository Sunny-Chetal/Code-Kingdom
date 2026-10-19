import os
from urllib.parse import quote

from authlib.integrations.base_client.errors import OAuthError
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse

import db

load_dotenv()

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="github",
    client_id=os.getenv("GITHUB_CLIENT_ID"),
    client_secret=os.getenv("GITHUB_CLIENT_SECRET"),
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "read:user user:email"},
)

router = APIRouter()

def _back_to_login(message: str) -> RedirectResponse:
    return RedirectResponse(url=f"/login?message={quote(message)}", status_code=303)

@router.post("/oauth_login")
async def oauth_login(request: Request, provider: str = Form(...)):
    provider = provider.lower()
    if provider not in ("google", "github"):
        return _back_to_login("Unknown sign-in provider.")
    client = oauth.create_client(provider)
    if not client.client_id:
        return _back_to_login(f"{provider.title()} sign-in isn't configured yet.")
    redirect_uri = str(request.url_for("oauth_callback", provider=provider))
    return await client.authorize_redirect(request, redirect_uri)

@router.get("/auth/{provider}/callback", name="oauth_callback")
async def oauth_callback(request: Request, provider: str):
    if provider not in ("google", "github"):
        return _back_to_login("Unknown sign-in provider.")
    client = oauth.create_client(provider)

    try:
        token = await client.authorize_access_token(request)
    except OAuthError:
        return _back_to_login("Sign-in was cancelled or failed. Please try again.")

    if provider == "google":
        info = token.get("userinfo") or {}
        oauth_id = info.get("sub")
        email = info.get("email")
        preferred = (info.get("name") or (email or "user").split("@")[0]).replace(" ", "")
    else:  
        profile = (await client.get("user", token=token)).json()
        oauth_id = str(profile.get("id", ""))
        email = profile.get("email")
        preferred = profile.get("login") or "user"

    if not oauth_id:
        return _back_to_login("Couldn't read your account details. Please try again.")

    user = db.get_user_by_oauth(provider, oauth_id) or db.create_oauth_user(
        provider, oauth_id, preferred, email
    )

    request.session["username"] = user["username"]
    return RedirectResponse(url="/dashboard", status_code=303)