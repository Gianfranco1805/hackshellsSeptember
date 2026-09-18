from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import contacts, public, walks

app = FastAPI(title="Safety Walking Companion API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.frontend_origin == "*" else [settings.frontend_origin],
    allow_credentials=settings.frontend_origin != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contacts.router)
app.include_router(walks.router)
app.include_router(public.router)


@app.get("/health")
def health():
    return {"status": "ok"}
