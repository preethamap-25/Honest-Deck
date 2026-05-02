from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta, timezone

from app.models.auth import LoginRequest, TokenResponse, RefreshRequest, ChangePasswordRequest
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password, hash_password,
    create_access_token, create_refresh_token,
    get_current_user,
)

router = APIRouter()


def _get_stored_password_hash() -> str:
    """Return the configured password hash, bootstrapping a default if empty."""
    if settings.ADMIN_PASSWORD_HASH:
        return settings.ADMIN_PASSWORD_HASH
    return hash_password("changeme123!")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    if body.username != settings.ADMIN_USERNAME:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(body.password, _get_stored_password_hash()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token({"sub": body.username})
    refresh_token = create_refresh_token()

    db = get_db()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db.refresh_tokens.insert_one({
        "token": refresh_token,
        "username": body.username,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    db = get_db()
    record = await db.refresh_tokens.find_one({"token": body.refresh_token})

    if not record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if record["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        await db.refresh_tokens.delete_one({"token": body.refresh_token})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    await db.refresh_tokens.delete_one({"token": body.refresh_token})
    new_refresh = create_refresh_token()
    new_access = create_access_token({"sub": record["username"]})

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db.refresh_tokens.insert_one({
        "token": new_refresh,
        "username": record["username"],
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=204)
async def logout(body: RefreshRequest):
    db = get_db()
    await db.refresh_tokens.delete_one({"token": body.refresh_token})


@router.post("/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    if not verify_password(body.current_password, _get_stored_password_hash()):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    new_hash = hash_password(body.new_password)
    print(f"\n[ACTION REQUIRED] Set this in your .env file:\nADMIN_PASSWORD_HASH={new_hash}\n")


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"], "role": "admin"}
