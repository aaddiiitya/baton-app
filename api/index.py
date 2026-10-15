"""
Baton — Python backend (FastAPI), deployed as a Vercel serverless function.

The React frontend never talks to Supabase directly. Every request goes to
this API, which:
  1. checks the user's login token with Supabase Auth,
  2. validates the input (again, on the server),
  3. reads/writes the Supabase database using the secret key.

The Supabase URL and secret key are read from ENVIRONMENT VARIABLES
(set in Vercel -> Project -> Settings -> Environment Variables, or in a local
.env file that is git-ignored). They are never sent to the browser.
"""

from __future__ import annotations

import os
import re
import secrets
import string
from datetime import date, datetime
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

try:  # Melbourne "today" so the date rules match the user's calendar.
    from zoneinfo import ZoneInfo

    TZ = ZoneInfo("Australia/Melbourne")
except Exception:  # pragma: no cover - fallback if tz data is missing
    TZ = None


def _load_local_env() -> None:
    """For local development only: read a git-ignored .env file if present."""
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_local_env()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
# Accept either name so both the new "secret" key and the legacy
# "service_role" key work.
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

Colour = Literal["orange", "blue", "purple", "green"]
Room = Literal["kitchen", "bathroom", "bedroom", "living room", "laundry", "outdoor"]


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def today() -> date:
    return datetime.now(TZ).date() if TZ else date.today()


def _server_headers(extra: Optional[dict] = None) -> dict:
    """Headers for server-to-Supabase calls using the secret key."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(500, "Server is not configured: Supabase environment variables are missing.")
    headers = {"apikey": SUPABASE_KEY, "Content-Type": "application/json"}
    # Legacy service_role keys are JWTs and also go in the Authorization header.
    if SUPABASE_KEY.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {SUPABASE_KEY}"
    if extra:
        headers.update(extra)
    return headers


def _client() -> httpx.Client:
    return httpx.Client(timeout=15.0)


def _rest_call(method: str, table: str, extra: Optional[dict] = None, **kwargs) -> httpx.Response:
    """Call the Supabase Data API, trying both header styles for the secret key."""
    variants = [_server_headers(extra)]
    if "Authorization" not in variants[0]:
        variants.append(_server_headers({**(extra or {}), "Authorization": f"Bearer {SUPABASE_KEY}"}))
    last = None
    with _client() as c:
        for headers in variants:
            last = c.request(method, f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, **kwargs)
            if last.status_code not in (401, 403):
                return last
    return last


def db_select(table: str, params: dict) -> list[dict]:
    r = _rest_call("GET", table, params=params)
    if r.status_code >= 400:
        raise HTTPException(502, f"Database read failed ({table}).")
    return r.json()


def db_insert(table: str, rows: list[dict] | dict) -> list[dict]:
    r = _rest_call("POST", table, {"Prefer": "return=representation"}, json=rows)
    if r.status_code >= 400:
        raise HTTPException(502, f"Database write failed ({table}).")
    return r.json()


def db_update(table: str, params: dict, values: dict) -> list[dict]:
    r = _rest_call("PATCH", table, {"Prefer": "return=representation"}, params=params, json=values)
    if r.status_code >= 400:
        raise HTTPException(502, f"Database update failed ({table}).")
    return r.json()


def new_join_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


def same_name(a: str, b: str) -> bool:
    return a.strip().lower() == b.strip().lower()


# ---------------------------------------------------------------------------
# Authentication (Supabase Auth, email + password)
# ---------------------------------------------------------------------------

def _auth_call(method: str, path: str, **kwargs) -> httpx.Response:
    """Call Supabase Auth with the secret key.

    New "sb_secret_" keys and legacy "service_role" JWT keys expect slightly
    different headers, so try the apikey-only form first, then apikey + Bearer.
    """
    variants = [_server_headers()]
    if "Authorization" not in variants[0]:
        variants.append(_server_headers({"Authorization": f"Bearer {SUPABASE_KEY}"}))
    last = None
    with _client() as c:
        for headers in variants:
            last = c.request(method, f"{SUPABASE_URL}/auth/v1{path}", headers=headers, **kwargs)
            if last.status_code not in (401, 403):
                return last
    return last

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=72)


def _password_login(email: str, password: str) -> dict:
    r = _auth_call("POST", "/token", params={"grant_type": "password"}, json={"email": email, "password": password})
    if r.status_code != 200:
        # Deliberately vague: do not reveal whether the email exists.
        raise HTTPException(401, "Email or password is incorrect.")
    data = r.json()
    return {"accessToken": data["access_token"], "email": data["user"]["email"]}


def current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """FastAPI dependency: turns the Bearer token into a verified user."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Please log in.")
    token = authorization.split(" ", 1)[1].strip()
    headers = _server_headers()
    headers["Authorization"] = f"Bearer {token}"
    with _client() as c:
        r = c.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
    if r.status_code != 200:
        raise HTTPException(401, "Your session has expired. Please log in again.")
    u = r.json()
    return {"id": u["id"], "email": u.get("email", "")}


# ---------------------------------------------------------------------------
# Shapes sent to the frontend (camelCase, matching src/types.ts)
# ---------------------------------------------------------------------------

def to_resident(r: dict) -> dict:
    return {
        "id": r["id"],
        "firstName": r["first_name"],
        "colour": r["colour"],
        "isCurrent": r["is_current"],
        "moveInDate": r["move_in_date"],
        "moveOutDate": r.get("move_out_date"),
        "bondContribution": float(r["bond_contribution"]) if r.get("bond_contribution") is not None else None,
    }


def to_entry(e: dict) -> dict:
    return {
        "id": e["id"],
        "kind": e["kind"],
        "date": e["entry_date"],
        "description": e["description"],
        "residentId": e.get("resident_id"),
        "awaitingConfirmation": e["awaiting_confirmation"],
        "room": e.get("room"),
        "note": e.get("note"),
    }


def to_handover(h: dict) -> dict:
    return {
        "id": h["id"],
        "date": h["handover_date"],
        "outgoingResidentId": h["outgoing_resident_id"],
        "incomingName": h["incoming_name"],
        "incomingColour": h["incoming_colour"],
        "incomingResponse": h["incoming_response"],
        "consentGiven": h["consent_given"],
        "signedByOutgoing": h["signed_by_outgoing"],
        "signedByIncoming": h["signed_by_incoming"],
        "roomsChecked": h["rooms_checked"],
        "damageItemsLogged": h["damage_items_logged"],
    }


def my_resident(user_id: str) -> Optional[dict]:
    """The user's most recent residency (current or past)."""
    rows = db_select(
        "residents",
        {"user_id": f"eq.{user_id}", "order": "is_current.desc,created_at.desc", "limit": "1"},
    )
    return rows[0] if rows else None


def require_current_resident(user: dict) -> dict:
    me = my_resident(user["id"])
    if not me:
        raise HTTPException(400, "Set up or join a house first.")
    if not me["is_current"]:
        raise HTTPException(403, "You have moved out of this house, so the record is read-only for you.")
    return me


def build_state(user: dict) -> dict:
    me = my_resident(user["id"])
    if not me:
        return {"user": {"id": "", "firstName": "", "email": user["email"]}, "house": None, "timeline": [], "handover": None}

    house_id = me["house_id"]
    house = db_select("houses", {"id": f"eq.{house_id}", "limit": "1"})[0]
    residents = db_select("residents", {"house_id": f"eq.{house_id}", "order": "created_at.asc"})
    entries = db_select("timeline_entries", {"house_id": f"eq.{house_id}", "order": "entry_date.desc,created_at.desc"})
    handovers = db_select(
        "handovers",
        {"outgoing_resident_id": f"eq.{me['id']}", "order": "created_at.desc", "limit": "1"},
    )
    return {
        "user": {"id": me["id"], "firstName": me["first_name"], "email": user["email"]},
        "house": {
            "id": house["id"],
            "address": house["address"],
            "totalBond": float(house["total_bond"]),
            "joinCode": house["join_code"],
            "residents": [to_resident(r) for r in residents],
        },
        "timeline": [to_entry(e) for e in entries],
        "handover": to_handover(handovers[0]) if handovers else None,
    }


# ---------------------------------------------------------------------------
# Request bodies (validated again on the server, never trusted from the UI)
# ---------------------------------------------------------------------------

class NewHouse(BaseModel):
    firstName: str = Field(min_length=1, max_length=40)
    address: str = Field(min_length=1, max_length=200)
    totalBond: float = Field(gt=0, le=1_000_000)
    bondContribution: float = Field(gt=0, le=1_000_000)
    moveInDate: date
    residentCount: int = Field(ge=2, le=8)
    colour: Colour


class JoinHouse(BaseModel):
    code: str = Field(min_length=4, max_length=12)
    firstName: str = Field(min_length=1, max_length=40)
    colour: Colour
    moveInDate: date
    bondContribution: float = Field(ge=0, le=1_000_000)


class NewDamage(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    room: Room
    date: date
    residentId: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=200)


class NewHandover(BaseModel):
    incomingName: str = Field(min_length=1, max_length=40)
    incomingColour: Colour
    incomingResponse: Literal["agree", "dispute"]
    consentGiven: bool
    signedByOutgoing: str = Field(min_length=1, max_length=40)
    signedByIncoming: str = Field(min_length=1, max_length=40)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

router = APIRouter()


@router.get("/health")
def health(probe: int = 0) -> dict:
    # Reports only WHETHER the variables exist, never their values.
    out = {"ok": True, "supabaseConfigured": bool(SUPABASE_URL and SUPABASE_KEY)}
    if probe and out["supabaseConfigured"]:
        # Connectivity check: HTTP status codes only, no data is returned.
        out["keyType"] = "legacy-jwt" if SUPABASE_KEY.startswith("eyJ") else SUPABASE_KEY.split("_")[0] + "_" + SUPABASE_KEY.split("_")[1] if "_" in SUPABASE_KEY else "other"
        out["database"] = _rest_call("GET", "houses", params={"select": "id", "limit": "1"}).status_code
        out["authAdmin"] = _auth_call("GET", "/admin/users", params={"per_page": "1"}).status_code
    return out


@router.post("/auth/signup")
def signup(body: Credentials) -> dict:
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Enter a valid email address.")
    # Preferred: create a confirmed user with the admin API (no email needed).
    r = _auth_call("POST", "/admin/users", json={"email": email, "password": body.password, "email_confirm": True})
    if r.status_code in (200, 201):
        return _password_login(email, body.password)
    if r.status_code == 422 or "already" in r.text.lower() or "exists" in r.text.lower():
        raise HTTPException(409, "An account with this email already exists. Log in instead.")
    if r.status_code == 400 and "password" in r.text.lower():
        raise HTTPException(400, "Choose a stronger password (at least 8 characters).")

    # Fallback: the normal public sign-up endpoint.
    r2 = _auth_call("POST", "/signup", json={"email": email, "password": body.password})
    if r2.status_code in (200, 201):
        data = r2.json()
        if data.get("access_token"):
            return {"accessToken": data["access_token"], "email": email}
        raise HTTPException(400, "Account created. Please confirm your email, then log in.")
    if "already" in r2.text.lower() or "exists" in r2.text.lower():
        raise HTTPException(409, "An account with this email already exists. Log in instead.")
    raise HTTPException(502, f"Could not create the account (code {r.status_code}/{r2.status_code}). Please try again.")


@router.post("/auth/login")
def login(body: Credentials) -> dict:
    return _password_login(body.email.strip().lower(), body.password)


@router.get("/state")
def state(user: dict = Depends(current_user)) -> dict:
    return build_state(user)


@router.post("/houses")
def create_house(body: NewHouse, user: dict = Depends(current_user)) -> dict:
    if body.bondContribution > body.totalBond:
        raise HTTPException(400, "Your contribution cannot exceed the total bond.")
    if body.moveInDate > today():
        raise HTTPException(400, "Move-in date cannot be in the future.")
    existing = my_resident(user["id"])
    if existing and existing["is_current"]:
        raise HTTPException(409, "You already belong to a house.")

    # Find an unused join code.
    code = new_join_code()
    while db_select("houses", {"join_code": f"eq.{code}", "select": "id"}):
        code = new_join_code()

    house = db_insert(
        "houses",
        {"address": body.address.strip(), "total_bond": body.totalBond, "join_code": code, "created_by": user["id"]},
    )[0]
    move_in = body.moveInDate.isoformat()
    db_insert(
        "residents",
        {
            "house_id": house["id"],
            "user_id": user["id"],
            "first_name": body.firstName.strip(),
            "colour": body.colour,
            "move_in_date": move_in,
            "bond_contribution": body.bondContribution,
        },
    )
    # Unnamed placeholders until the other housemates join with the code.
    others = [c for c in ("orange", "blue", "purple", "green") if c != body.colour]
    placeholders = [
        {
            "house_id": house["id"],
            "first_name": f"Housemate {i + 1}",
            "colour": others[i % len(others)],
            "move_in_date": move_in,
        }
        for i in range(body.residentCount - 1)
    ]
    if placeholders:
        db_insert("residents", placeholders)
    db_insert(
        "timeline_entries",
        {
            "house_id": house["id"],
            "kind": "house-created",
            "entry_date": move_in,
            "description": f"House created — {body.address.strip()}",
            "created_by": user["id"],
        },
    )
    return build_state(user)


@router.post("/houses/join")
def join_house(body: JoinHouse, user: dict = Depends(current_user)) -> dict:
    if body.moveInDate > today():
        raise HTTPException(400, "Move-in date cannot be in the future.")
    existing = my_resident(user["id"])
    if existing and existing["is_current"]:
        raise HTTPException(409, "You already belong to a house.")
    houses = db_select("houses", {"join_code": f"eq.{body.code.strip().upper()}", "limit": "1"})
    if not houses:
        raise HTTPException(404, "That house code was not recognised.")
    house = houses[0]
    current = db_select("residents", {"house_id": f"eq.{house['id']}", "is_current": "eq.true"})
    holder = next((r for r in current if r["colour"] == body.colour), None)
    mine = {
        "user_id": user["id"],
        "first_name": body.firstName.strip(),
        "move_in_date": body.moveInDate.isoformat(),
        "bond_contribution": body.bondContribution,
    }
    if holder and holder.get("user_id") is None and holder["first_name"].startswith("Housemate "):
        # The colour belongs to an unnamed placeholder: the new member claims it.
        me = db_update("residents", {"id": f"eq.{holder['id']}"}, mine)[0]
    elif holder:
        raise HTTPException(409, "That colour is already used by a current housemate. Pick another.")
    else:
        me = db_insert("residents", {**mine, "house_id": house["id"], "colour": body.colour})[0]
    db_insert(
        "timeline_entries",
        {
            "house_id": house["id"],
            "kind": "move-in",
            "entry_date": body.moveInDate.isoformat(),
            "description": f"{me['first_name']} joined the house",
            "resident_id": me["id"],
            "created_by": user["id"],
        },
    )
    return build_state(user)


@router.post("/damage")
def add_damage(body: NewDamage, user: dict = Depends(current_user)) -> dict:
    me = require_current_resident(user)
    if body.date > today():
        raise HTTPException(400, "Date noticed cannot be in the future.")
    if body.residentId:
        match = db_select(
            "residents",
            {"id": f"eq.{body.residentId}", "house_id": f"eq.{me['house_id']}", "is_current": "eq.true"},
        )
        if not match:
            raise HTTPException(400, "That person is not a current resident of this house.")
    note = body.note.strip() if body.note and body.note.strip() else None
    db_insert(
        "timeline_entries",
        {
            "house_id": me["house_id"],
            "kind": "damage",
            "entry_date": body.date.isoformat(),
            "description": body.description.strip(),
            "resident_id": body.residentId,
            # Fairness rule: naming someone else is only a claim.
            "awaiting_confirmation": bool(body.residentId and body.residentId != me["id"]),
            "room": body.room,
            "note": note,
            "created_by": user["id"],
        },
    )
    return build_state(user)


@router.post("/handovers")
def create_handover(body: NewHandover, user: dict = Depends(current_user)) -> dict:
    me = require_current_resident(user)
    if not body.consentGiven:
        raise HTTPException(400, "Both of you must agree before this can be signed.")
    if not same_name(body.signedByOutgoing, me["first_name"]):
        raise HTTPException(400, f"Your signature must match “{me['first_name']}”.")
    if not same_name(body.signedByIncoming, body.incomingName):
        raise HTTPException(400, "The incoming renter's signature must match their name.")

    house_id = me["house_id"]
    current = db_select("residents", {"house_id": f"eq.{house_id}", "is_current": "eq.true"})
    taken = {r["colour"] for r in current if r["id"] != me["id"]}
    if body.incomingColour in taken:
        raise HTTPException(409, "That colour is already used by a current housemate.")

    damage = db_select("timeline_entries", {"house_id": f"eq.{house_id}", "kind": "eq.damage", "select": "room"})
    rooms_checked = len({d["room"] for d in damage if d.get("room")})
    when = today().isoformat()
    record = {
        "house_id": house_id,
        "handover_date": when,
        "outgoing_resident_id": me["id"],
        "incoming_name": body.incomingName.strip(),
        "incoming_colour": body.incomingColour,
        "incoming_response": body.incomingResponse,
        "consent_given": True,
        "signed_by_outgoing": body.signedByOutgoing.strip(),
        "signed_by_incoming": body.signedByIncoming.strip(),
        "rooms_checked": rooms_checked,
        "damage_items_logged": len(damage),
    }

    if body.incomingResponse == "dispute":
        # Logged for the audit trail, but nothing about the house changes.
        saved = db_insert("handovers", record)[0]
        return {"result": "failure", "handover": to_handover(saved), "state": build_state(user)}

    incoming = db_insert(
        "residents",
        {
            "house_id": house_id,
            "first_name": body.incomingName.strip(),
            "colour": body.incomingColour,
            "move_in_date": when,
            "bond_contribution": me.get("bond_contribution"),
        },
    )[0]
    db_update("residents", {"id": f"eq.{me['id']}"}, {"is_current": False, "move_out_date": when})
    record["incoming_resident_id"] = incoming["id"]
    saved = db_insert("handovers", record)[0]
    db_insert(
        "timeline_entries",
        [
            {
                "house_id": house_id,
                "kind": "handover",
                "entry_date": when,
                "description": f"Handover signed — liability boundary set with {incoming['first_name']}",
                "created_by": user["id"],
            },
            {
                "house_id": house_id,
                "kind": "move-out",
                "entry_date": when,
                "description": f"{me['first_name']} moved out",
                "resident_id": me["id"],
                "created_by": user["id"],
            },
            {
                "house_id": house_id,
                "kind": "move-in",
                "entry_date": when,
                "description": f"{incoming['first_name']} moved in",
                "resident_id": incoming["id"],
                "created_by": user["id"],
            },
        ],
    )
    return {"result": "success", "handover": to_handover(saved), "state": build_state(user)}


# Vercel passes the full path (/api/...); a local uvicorn run may not.
app = FastAPI(title="Baton API", docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(router, prefix="/api")
app.include_router(router)
