import jwt
from fastapi import Header, HTTPException, status
from jwt import PyJWKClient

from .config import settings

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Cached client for Supabase's JWKS endpoint.

    Supabase projects created on the newer asymmetric signing-key system
    (ES256) don't have a shared HS256 secret to verify tokens against -- the
    private key never leaves Supabase. Verifying via JWKS works for both that
    and RS256 projects, and needs no secret in our own config at all.
    """
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Verifies the Supabase Auth JWT sent by the frontend and returns the user id."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
        )
    token = authorization.removeprefix("Bearer ").strip()

    if not settings.supabase_url:
        raise HTTPException(status_code=500, detail="Server auth is not configured")

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
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
