from typing import Any, Dict, List, Optional

from pymongo import ASCENDING, UpdateOne

from backend.app.database import get_collection


def get_menu_col():
    return get_collection("menu_items")

def list_menu_items(active_only: bool = True) -> List[Dict[str, Any]]:
    col = get_menu_col()
    query = {"active": True} if active_only else {}
    items = []
    for doc in col.find(query).sort("name", ASCENDING):
        items.append({
            "id": doc["_id"],
            "name": doc["name"],
            "category": doc["category"],
            "tags": doc.get("tags", []),
            "price": float(doc["price"]),
            "active": doc.get("active", True),
            "introduced_date": doc.get("introduced_date"),
            "discontinued_date": doc.get("discontinued_date")
        })
    return items

def get_menu_item(item_id: str) -> Optional[Dict[str, Any]]:
    col = get_menu_col()
    doc = col.find_one({"_id": item_id})
    if not doc:
        return None
    return {
        "id": doc["_id"],
        "name": doc["name"],
        "category": doc["category"],
        "tags": doc.get("tags", []),
        "price": float(doc["price"]),
        "active": doc.get("active", True),
        "introduced_date": doc.get("introduced_date"),
        "discontinued_date": doc.get("discontinued_date")
    }

def upsert_menu_item(item: Dict[str, Any]) -> Dict[str, Any]:
    col = get_menu_col()
    doc = {
        "_id": item["id"],
        "name": item["name"],
        "category": item["category"],
        "tags": item.get("tags", []),
        "price": float(item["price"]),
        "active": bool(item.get("active", True)),
        "introduced_date": item.get("introduced_date"),
        "discontinued_date": item.get("discontinued_date")
    }
    col.replace_one({"_id": item["id"]}, doc, upsert=True)
    return doc

def bulk_seed_menu_items(items: List[Dict[str, Any]]) -> int:
    """Uses bulk_write with UpdateOne(upsert=True) per Section 8.1."""
    if not items:
        return 0
    col = get_menu_col()
    ops = [
        UpdateOne(
            {"_id": item["id"]},
            {"$set": {
                "name": item["name"],
                "category": item["category"],
                "tags": item.get("tags", []),
                "price": float(item["price"]),
                "active": bool(item.get("active", True)),
                "introduced_date": item.get("introduced_date"),
                "discontinued_date": item.get("discontinued_date")
            }},
            upsert=True
        )
        for item in items
    ]
    res = col.bulk_write(ops)
    return res.upserted_count + res.modified_count + res.matched_count

def update_item_status(item_id: str, active: Optional[bool] = None, price: Optional[float] = None) -> Optional[Dict[str, Any]]:
    col = get_menu_col()
    update_fields: Dict[str, Any] = {}
    if active is not None:
        update_fields["active"] = active
    if price is not None:
        update_fields["price"] = float(price)

    if not update_fields:
        return get_menu_item(item_id)

    col.update_one({"_id": item_id}, {"$set": update_fields})
    return get_menu_item(item_id)
