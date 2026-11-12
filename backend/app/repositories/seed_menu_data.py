from typing import Any, Dict, List

from backend.app.repositories.menu_repository import bulk_seed_menu_items

SEEDED_MENU_ITEMS: List[Dict[str, Any]] = [
    {
        "id": "paneer_rice_bowl",
        "name": "Paneer Rice Bowl",
        "category": "main",
        "tags": ["vegetarian", "rice", "staple"],
        "price": 90.0,
        "active": True
    },
    {
        "id": "dal_tadka_rice",
        "name": "Dal Tadka + Steamed Rice",
        "category": "main",
        "tags": ["vegan", "gluten-free", "comfort", "staple"],
        "price": 70.0,
        "active": True
    },
    {
        "id": "rajma_chawal",
        "name": "Punjabi Rajma Chawal",
        "category": "main",
        "tags": ["vegetarian", "popular", "north-indian"],
        "price": 80.0,
        "active": True
    },
    {
        "id": "chole_bhature",
        "name": "Chole Bhature (2 pcs)",
        "category": "main",
        "tags": ["vegetarian", "popular", "treat"],
        "price": 85.0,
        "active": True
    },
    {
        "id": "veg_biryani",
        "name": "Hyderabadi Veg Dum Biryani",
        "category": "main",
        "tags": ["vegetarian", "rice", "aromatic"],
        "price": 95.0,
        "active": True
    },
    {
        "id": "chicken_biryani",
        "name": "Special Chicken Biryani",
        "category": "main",
        "tags": ["non-veg", "rice", "bestseller"],
        "price": 130.0,
        "active": True
    },
    {
        "id": "egg_curry_rice",
        "name": "Homestyle Egg Curry + Rice",
        "category": "main",
        "tags": ["egg", "protein", "staple"],
        "price": 85.0,
        "active": True
    },
    {
        "id": "masala_dosa",
        "name": "Crispy Masala Dosa",
        "category": "breakfast",
        "tags": ["vegetarian", "south-indian", "bestseller"],
        "price": 60.0,
        "active": True
    },
    {
        "id": "idli_sambar",
        "name": "Steamed Idli Sambar (4 pcs)",
        "category": "breakfast",
        "tags": ["vegan", "light", "gluten-free"],
        "price": 45.0,
        "active": True
    },
    {
        "id": "poha",
        "name": "Indori Batata Poha",
        "category": "breakfast",
        "tags": ["vegan", "quick", "breakfast-staple"],
        "price": 35.0,
        "active": True
    },
    {
        "id": "aloo_paratha",
        "name": "Tawa Aloo Paratha with Curd",
        "category": "breakfast",
        "tags": ["vegetarian", "hearty", "north-indian"],
        "price": 50.0,
        "active": True
    },
    {
        "id": "veg_sandwich",
        "name": "Cheese Veg Grilled Sandwich",
        "category": "snack",
        "tags": ["vegetarian", "grilled", "quick"],
        "price": 55.0,
        "active": True
    },
    {
        "id": "maggi",
        "name": "Classic Butter Masala Maggi",
        "category": "snack",
        "tags": ["vegetarian", "campus-favorite", "comfort"],
        "price": 40.0,
        "active": True
    },
    {
        "id": "samosa",
        "name": "Crispy Punjabi Samosa (2 pcs)",
        "category": "snack",
        "tags": ["vegan", "snack", "fried"],
        "price": 25.0,
        "active": True
    },
    {
        "id": "cold_coffee",
        "name": "Classic Thick Cold Coffee",
        "category": "beverage",
        "tags": ["vegetarian", "refreshing", "bestseller"],
        "price": 50.0,
        "active": True
    },
    {
        "id": "fruit_bowl",
        "name": "Seasonal Fresh Fruit Bowl",
        "category": "snack",
        "tags": ["vegan", "healthy", "gluten-free"],
        "price": 45.0,
        "active": True
    },
    {
        "id": "gulab_jamun",
        "name": "Warm Gulab Jamun (2 pcs)",
        "category": "dessert",
        "tags": ["vegetarian", "sweet"],
        "price": 35.0,
        "active": True
    },
    {
        "id": "avocado_sourdough",
        "name": "Avocado Sourdough Toast",
        "category": "breakfast",
        "tags": ["special", "healthy", "new-item"],
        "price": 110.0,
        "active": True,
        "introduced_date": "2026-10-15"  # Introduced mid-history!
    },
    {
        "id": "special_tacos",
        "name": "Chef Special Mexican Tacos",
        "category": "main",
        "tags": ["special", "mexican", "new-item"],
        "price": 95.0,
        "active": True,
        "introduced_date": "2026-10-25"  # Introduced mid-history!
    },
    {
        "id": "mutton_roll",
        "name": "Kolkata Mutton Roll",
        "category": "snack",
        "tags": ["non-veg", "special"],
        "price": 120.0,
        "active": False,
        "discontinued_date": "2026-09-15"  # Discontinued mid-history!
    }
]

def seed_menu():
    count = bulk_seed_menu_items(SEEDED_MENU_ITEMS)
    print(f"Successfully seeded {count} menu items via bulk_write.")
    return count
