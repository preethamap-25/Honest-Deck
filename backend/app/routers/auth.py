from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta, timezone

from app.models.auth import LoginRequest, TokenResponse, RefreshRequest, ChangePasswordRequest, RegisterRequest
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password, hash_password,
    create_access_token, create_refresh_token,
    get_current_user,
)

router = APIRouter()


def _get_stored_password_hash() -> str:
    """Return the configured admin password hash."""
    if not settings.ADMIN_PASSWORD_HASH:
        return ""
    return settings.ADMIN_PASSWORD_HASH


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    db = get_db()
    authenticated = False
    username = body.username

    # Check admin credentials first
    admin_hash = _get_stored_password_hash()
    if body.username == settings.ADMIN_USERNAME and admin_hash:
        if verify_password(body.password, admin_hash):
            authenticated = True
    
    # Check registered users in DB (by username or email)
    if not authenticated:
        user = await db.users.find_one({
            "$or": [{"username": body.username}, {"email": body.username}]
        })
        if user and verify_password(body.password, user["password_hash"]):
            authenticated = True
            username = user["username"]

    if not authenticated:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token({"sub": username})
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


@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    import traceback
    try:
        db = get_db()
        # Check if username already exists
        existing = await db.users.find_one({"username": body.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

        # Create user document
        user_doc = {
            "username": body.username,
            "password_hash": hash_password(body.password),
            "name": body.name,
            "email": body.email,
            "role": "user",
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(user_doc)
        return {"message": "Account created successfully", "username": body.username}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    username = current_user["username"]
    # Admin user
    if username == settings.ADMIN_USERNAME:
        return {"username": username, "role": "admin"}
    # Registered user — look up role from DB
    db = get_db()
    user = await db.users.find_one({"username": username})
    role = user.get("role", "user") if user else "user"
    return {"username": username, "role": role}
