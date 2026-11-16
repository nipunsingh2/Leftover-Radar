from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from backend.app.errors import AppError
from backend.app.repositories.menu_repository import (
    get_menu_col,
    get_menu_item,
    list_menu_items,
    upsert_menu_item,
)

router = APIRouter(prefix="/menu-items", tags=["Menu Items"])


class MenuItemCreatePayload(BaseModel):
    id: str = Field(description="Unique snake_case identifier e.g. chicken_biryani")
    name: str = Field(description="Human readable dish name")
    category: str = Field(description="main, breakfast, snack, beverage, dessert")
    price: float = Field(ge=0)
    tags: Optional[List[str]] = Field(default_factory=list)
    active: Optional[bool] = True


class MenuItemUpdatePayload(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    tags: Optional[List[str]] = None
    active: Optional[bool] = None


@router.get("", status_code=200)
def get_all_menu_items(active_only: bool = Query(False, description="Filter only active dishes")) -> List[Dict[str, Any]]:
    """List menu items with categories, prices, tags, and active status."""
    return list_menu_items(active_only=active_only)


@router.get("/{item_id}", status_code=200)
def get_single_menu_item(item_id: str) -> Dict[str, Any]:
    item = get_menu_item(item_id)
    if not item:
        raise AppError(
            code="NOT_FOUND",
            message=f"Menu item '{item_id}' not found.",
            status_code=404,
        )
    return item


@router.post("", status_code=201)
def create_menu_item(payload: MenuItemCreatePayload) -> Dict[str, Any]:
    """Create a new dish entry in menu_items collection."""
    col = get_menu_col()
    existing = col.find_one({"_id": payload.id})
    if existing:
        raise AppError(
            code="CONFLICT",
            message=f"Menu item with ID '{payload.id}' already exists.",
            status_code=409,
        )

    doc = {
        "id": payload.id,
        "name": payload.name,
        "category": payload.category.lower(),
        "tags": payload.tags or [],
        "price": float(payload.price),
        "active": payload.active if payload.active is not None else True,
    }
    saved = upsert_menu_item(doc)
    return {
        "id": saved["_id"],
        "name": saved["name"],
        "category": saved["category"],
        "tags": saved.get("tags", []),
        "price": float(saved["price"]),
        "active": saved.get("active", True),
    }


@router.patch("/{item_id}", status_code=200)
def update_menu_item(item_id: str, payload: MenuItemUpdatePayload) -> Dict[str, Any]:
    """Toggle active status, update price, category, or dish tags (Section 8.3)."""
    item = get_menu_item(item_id)
    if not item:
        raise AppError(
            code="NOT_FOUND",
            message=f"Menu item '{item_id}' not found.",
            status_code=404,
        )

    update_fields: Dict[str, Any] = {}
    if payload.name is not None:
        update_fields["name"] = payload.name
    if payload.category is not None:
        update_fields["category"] = payload.category.lower()
    if payload.price is not None:
        update_fields["price"] = float(payload.price)
    if payload.tags is not None:
        update_fields["tags"] = payload.tags
    if payload.active is not None:
        update_fields["active"] = payload.active

    if not update_fields:
        return item

    col = get_menu_col()
    col.update_one({"_id": item_id}, {"$set": update_fields})
    updated = get_menu_item(item_id)
    return updated or item
