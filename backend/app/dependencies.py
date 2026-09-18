import jwt
from fastapi import Header, HTTPException, status

from .config import settings


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Verifies the Supabase Auth JWT sent by the frontend and returns the user id.

    Decoded locally with the project's JWT secret (Project Settings -> API ->
    JWT Settings) rather than round-tripping to Supabase on every request.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
        )
    token = authorization.removeprefix("Bearer ").strip()

    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=500, detail="Server auth is not configured")

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}"
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject"
        )
    return user_id
