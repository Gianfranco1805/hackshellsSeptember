from fastapi import APIRouter, Depends, HTTPException

from ..db import get_supabase
from ..dependencies import get_current_user_id
from ..schemas import ContactCreate, ContactOut, ContactUpdate

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactOut])
def list_contacts(user_id: str = Depends(get_current_user_id)):
    db = get_supabase()
    res = db.table("contacts").select("*").eq("user_id", user_id).order("created_at").execute()
    return res.data


@router.post("", response_model=ContactOut, status_code=201)
def create_contact(payload: ContactCreate, user_id: str = Depends(get_current_user_id)):
    db = get_supabase()
    row = {**payload.model_dump(), "user_id": user_id}
    res = db.table("contacts").insert(row).execute()
    return res.data[0]


@router.put("/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: str, payload: ContactUpdate, user_id: str = Depends(get_current_user_id)
):
    db = get_supabase()
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = (
        db.table("contacts")
        .update(updates)
        .eq("id", contact_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Contact not found")
    return res.data[0]


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_supabase()
    res = db.table("contacts").delete().eq("id", contact_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Contact not found")
