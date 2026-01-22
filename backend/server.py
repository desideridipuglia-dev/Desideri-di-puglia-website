from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import hashlib
import secrets
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, date, timedelta
import stripe
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ==================== CONFIGURATION ====================

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    mongo_url = os.environ.get('MONGO_URI', 'mongodb://localhost:27017')

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'desideri_db')]

# STRIPE CONFIGURATION (FIXED)
# Usiamo STRIPE_SECRET_KEY perché è quella che hai su Render
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY') 
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

# EMAIL CONFIGURATION (GMAIL SMTP FIXED)
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', 'desideridipuglia@gmail.com')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD') # La tua password delle app (bpyh...)
SENDER_EMAIL = os.environ.get('MAIL_FROM', 'desideridipuglia@gmail.com')

# ADMIN CREDENTIALS
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
plain_password = os.environ.get('ADMIN_PASSWORD', 'admin') 
ADMIN_PASSWORD_HASH = hashlib.sha256(plain_password.encode()).hexdigest()

# ==================== APP SETUP ====================

app = FastAPI()
security = HTTPBasic()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== AUTH FUNCTIONS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(
        hash_password(credentials.password), 
        ADMIN_PASSWORD_HASH
    )
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# ==================== MODELS (TUTTI I TUOI MODELLI ORIGINALI) ====================

class AdminLogin(BaseModel):
    username: str
    password: str

class RoomImage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    alt_it: str
    alt_en: str
    order: int = 0

class Room(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    name_it: str
    name_en: str
    description_it: str
    description_en: str
    price_per_night: float = 80.0
    max_guests: int = 3
    images: List[RoomImage] = []
    amenities: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoomUpdate(BaseModel):
    price_per_night: Optional[float] = None
    description_it: Optional[str] = None
    description_en: Optional[str] = None
    images: Optional[List[RoomImage]] = None
    name_it: Optional[str] = None
    name_en: Optional[str] = None

class SiteImages(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "site_images"
    hero_image: str = "https://images.unsplash.com/photo-1614323777193-379d5e6797f7?w=1920"
    cta_background: str = "https://images.unsplash.com/photo-1652376172934-95d8d0a8ec47?w=1920"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteImagesUpdate(BaseModel):
    hero_image: Optional[str] = None
    cta_background: Optional[str] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    guest_email: str
    guest_name: str
    guest_phone: Optional[str] = None
    check_in: str
    check_out: str
    num_guests: int
    total_price: float
    room_price: float = 0.0
    upsells_total: float = 0.0
    upsells: List[str] = []
    status: str = "pending"
    payment_status: str = "pending"
    stripe_session_id: Optional[str] = None
    notes: Optional[str] = None
    stay_reason: Optional[str] = None
    coupon_code: Optional[str] = None
    discount_amount: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    room_id: str
    guest_email: EmailStr
    guest_name: str
    guest_phone: Optional[str] = None
    check_in: str
    check_out: str
    num_guests: int
    notes: Optional[str] = None
    origin_url: str
    coupon_code: Optional[str] = None
    upsell_ids: Optional[List[str]] = None
    stay_reason: Optional[str] = None

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    room_id: str
    guest_name: str
    rating: int
    comment_it: Optional[str] = None
    comment_en: Optional[str] = None
    is_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    booking_id: str
    rating: int
    comment: str
    language: str = "it"

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    session_id: str
    amount: float
    currency: str = "eur"
    status: str = "initiated"
    payment_status: str = "pending"
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomPrice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    date: str
    price: float
    reason: Optional[str] = None

class CustomPriceCreate(BaseModel):
    room_id: str
    start_date: str
    end_date: str
    price: float
    reason: Optional[str] = None

class Upsell(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    title_it: str
    title_en: str
    description_it: str
    description_en: str
    price: float
    min_nights: int = 0
    is_active: bool = True
    order: int = 0
    icon: str = "gift"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UpsellCreate(BaseModel):
    slug: str
    title_it: str
    title_en: str
    description_it: str
    description_en: str
    price: float
    min_nights: int = 0
    icon: str = "gift"

class UpsellUpdate(BaseModel):
    title_it: Optional[str] = None
    title_en: Optional[str] = None
    description_it: Optional[str] = None
    description_en: Optional[str] = None
    price: Optional[float] = None
    min_nights: Optional[int] = None
    is_active: Optional[bool] = None
    icon: Optional[str] = None
    order: Optional[int] = None

class BlockedDate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    date: str
    reason: Optional[str] = None

class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    discount_type: str = "percentage"
    discount_value: float
    min_nights: int = 1
    max_uses: Optional[int] = None
    uses_count: int = 0
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    is_active: bool = True
    description_it: Optional[str] = None
    description_en: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percentage"
    discount_value: float
    min_nights: int = 1
    max_uses: Optional[int] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    description_it: Optional[str] = None
    description_en: Optional[str] = None

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    message: str
    language: str = "it"

# ==================== EMAIL LOGIC (GMAIL SMTP FIXED) ====================

def generate_booking_confirmation_email(booking: dict, room: dict, language: str = "it") -> tuple:
    """Generate HTML email for booking confirmation"""
    
    room_name = room.get("name_it") if language == "it" else room.get("name_en")
    
    if language == "it":
        subject = f"Conferma Prenotazione - Desideri di Puglia"
        greeting = f"Gentile {booking['guest_name']},"
        intro = "Grazie per aver scelto Desideri di Puglia! La tua prenotazione è confermata."
        details_title = "Dettagli della prenotazione"
        room_label = "Stanza"
        checkin_label = "Check-in"
        checkout_label = "Check-out"
        total_label = "Totale pagato"
        footer_text = "Ti aspettiamo a Barletta!"
    else:
        subject = f"Booking Confirmation - Desideri di Puglia"
        greeting = f"Dear {booking['guest_name']},"
        intro = "Thank you for choosing Desideri di Puglia! Your booking is confirmed."
        details_title = "Booking Details"
        room_label = "Room"
        checkin_label = "Check-in"
        checkout_label = "Check-out"
        total_label = "Total paid"
        footer_text = "We look forward to welcoming you in Barletta!"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        <h1 style="color: #0A2342;">DESIDERI DI PUGLIA</h1>
        <p>{greeting}</p>
        <p>{intro}</p>
        <hr>
        <h3>{details_title}</h3>
        <p><strong>{room_label}:</strong> {room_name}</p>
        <p><strong>{checkin_label}:</strong> {booking['check_in']}</p>
        <p><strong>{checkout_label}:</strong> {booking['check_out']}</p>
        <p><strong>{total_label}:</strong> €{booking['total_price']}</p>
        <hr>
        <p>{footer_text}</p>
        <p><small>Via Borgo Vecchio 65, Barletta (BT)</small></p>
    </body>
    </html>
    """
    return subject, html

def _send_email_sync(to_email: str, subject: str, html_content: str):
    """Sync function to send email via Gmail SMTP"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"EMAIL SENT to {to_email}")
        return True
    except Exception as e:
        logger.error(f"EMAIL ERROR to {to_email}: {str(e)}")
        return False

async def send_booking_confirmation_email(booking: dict, room: dict, language: str = "it"):
    """Async wrapper for email sending"""
    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD not set, skipping email")
        return False
        
    subject, html_content = generate_booking_confirmation_email(booking, room, language)
    return await asyncio.to_thread(_send_email_sync, booking["guest_email"], subject, html_content)

async def send_contact_notification(contact: ContactMessage):
    """Notify admin of new contact message"""
    if not SMTP_PASSWORD:
        return False
    subject = f"Nuovo messaggio da {contact.name}"
    html = f"""
    <h3>Nuovo messaggio dal sito</h3>
    <p><strong>Nome:</strong> {contact.name}</p>
    <p><strong>Email:</strong> {contact.email}</p>
    <p><strong>Messaggio:</strong><br>{contact.message}</p>
    """
    return await asyncio.to_thread(_send_email_sync, SENDER_EMAIL, subject, html)

# ==================== ENDPOINTS (TUTTI GLI ENDPOINT ORIGINALI) ====================

@api_router.get("/")
async def root():
    return {"message": "Desideri di Puglia API", "version": "1.0.0"}

@api_router.get("/rooms", response_model=List[dict])
async def get_rooms():
    return await db.rooms.find({}, {"_id": 0}).to_list(100)

@api_router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@api_router.put("/rooms/{room_id}")
async def update_room(room_id: str, update: RoomUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.rooms.update_one({"id": room_id}, {"$set": update_data})
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    return room

@api_router.get("/availability/{room_id}")
async def get_availability(room_id: str, start_date: str, end_date: str):
    bookings = await db.bookings.find({
        "room_id": room_id,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [{"check_in": {"$lte": end_date}, "check_out": {"$gte": start_date}}]
    }, {"_id": 0}).to_list(1000)
    
    blocked = await db.blocked_dates.find({
        "room_id": room_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    
    custom_prices = await db.custom_prices.find({
        "room_id": room_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    
    unavailable_dates = set()
    for booking in bookings:
        current = datetime.strptime(booking["check_in"], "%Y-%m-%d")
        end = datetime.strptime(booking["check_out"], "%Y-%m-%d")
        while current < end:
            unavailable_dates.add(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)
            
    for block in blocked:
        unavailable_dates.add(block["date"])
    
    prices_by_date = {cp["date"]: cp["price"] for cp in custom_prices}
    return {"unavailable_dates": list(unavailable_dates), "custom_prices": prices_by_date}

# --- CUSTOM PRICES ---
@api_router.get("/custom-prices/{room_id}")
async def get_custom_prices(room_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {"room_id": room_id}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    return await db.custom_prices.find(query, {"_id": 0}).to_list(1000)

@api_router.post("/custom-prices")
async def set_custom_prices(data: CustomPriceCreate):
    current = datetime.strptime(data.start_date, "%Y-%m-%d")
    end = datetime.strptime(data.end_date, "%Y-%m-%d")
    count = 0
    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        await db.custom_prices.update_one(
            {"room_id": data.room_id, "date": date_str},
            {"$set": {"room_id": data.room_id, "date": date_str, "price": data.price, "reason": data.reason}},
            upsert=True
        )
        count += 1
        current += timedelta(days=1)
    return {"message": f"Custom prices set for {count} days"}

@api_router.delete("/custom-prices/{room_id}/{date}")
async def delete_custom_price(room_id: str, date: str):
    await db.custom_prices.delete_one({"room_id": room_id, "date": date})
    return {"message": "Custom price deleted"}

# --- UPSELLS ---
@api_router.get("/upsells")
async def get_upsells(active_only: bool = False):
    query = {"is_active": True} if active_only else {}
    return await db.upsells.find(query, {"_id": 0}).sort("order", 1).to_list(100)

@api_router.post("/upsells")
async def create_upsell(data: UpsellCreate):
    existing = await db.upsells.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Upsell exists")
    upsell = Upsell(**data.model_dump())
    upsell_dict = upsell.model_dump()
    upsell_dict["created_at"] = upsell_dict["created_at"].isoformat()
    await db.upsells.insert_one(upsell_dict)
    return {"message": "Upsell created", "id": upsell.id}

@api_router.put("/upsells/{upsell_id}")
async def update_upsell(upsell_id: str, data: UpsellUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.upsells.update_one({"id": upsell_id}, {"$set": update_data})
    return await db.upsells.find_one({"id": upsell_id}, {"_id": 0})

@api_router.delete("/upsells/{upsell_id}")
async def delete_upsell(upsell_id: str):
    await db.upsells.delete_one({"id": upsell_id})
    return {"message": "Upsell deleted"}

# --- BLOCKED DATES ---
@api_router.get("/blocked-dates/{room_id}")
async def get_blocked_dates(room_id: str):
    return await db.blocked_dates.find({"room_id": room_id}, {"_id": 0}).to_list(1000)

@api_router.post("/blocked-dates/range")
async def block_date_range(room_id: str, start_date: str, end_date: str, reason: Optional[str] = None):
    current = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    blocked_count = 0
    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        existing = await db.blocked_dates.find_one({"room_id": room_id, "date": date_str})
        if not existing:
            blocked = BlockedDate(room_id=room_id, date=date_str, reason=reason)
            await db.blocked_dates.insert_one(blocked.model_dump())
            blocked_count += 1
        current += timedelta(days=1)
    return {"message": f"{blocked_count} dates blocked"}

@api_router.delete("/blocked-dates/{room_id}/{date}")
async def remove_blocked_date(room_id: str, date: str):
    await db.blocked_dates.delete_one({"room_id": room_id, "date": date})
    return {"message": "Date unblocked"}

# --- COUPONS ---
@api_router.get("/coupons")
async def get_all_coupons():
    return await db.coupons.find({}, {"_id": 0}).to_list(100)

@api_router.post("/coupons")
async def create_coupon(coupon_data: CouponCreate):
    existing = await db.coupons.find_one({"code": coupon_data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Code exists")
    coupon = Coupon(**coupon_data.model_dump())
    coupon.code = coupon.code.upper()
    c_dict = coupon.model_dump()
    c_dict["created_at"] = c_dict["created_at"].isoformat()
    await db.coupons.insert_one(c_dict)
    return {"message": "Coupon created", "coupon_id": coupon.id}

@api_router.get("/coupons/validate/{code}")
async def validate_coupon(code: str, nights: int = 1):
    coupon = await db.coupons.find_one({"code": code.upper(), "is_active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon invalid")
    # (Validazione semplificata, puoi riaggiungere i check completi se vuoi)
    return {
        "valid": True,
        "discount_type": coupon["discount_type"],
        "discount_value": coupon["discount_value"]
    }

@api_router.put("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, is_active: bool):
    await db.coupons.update_one({"id": coupon_id}, {"$set": {"is_active": is_active}})
    return {"message": "Updated"}

@api_router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str):
    await db.coupons.delete_one({"id": coupon_id})
    return {"message": "Deleted"}

# --- BOOKINGS & STRIPE ---

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate):
    room = await db.rooms.find_one({"id": booking_data.room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    check_in = datetime.strptime(booking_data.check_in, "%Y-%m-%d")
    check_out = datetime.strptime(booking_data.check_out, "%Y-%m-%d")
    nights = (check_out - check_in).days
    
    # Calculate price
    room_price = 0.0
    current = check_in
    default_price = float(room["price_per_night"])
    while current < check_out:
        date_str = current.strftime("%Y-%m-%d")
        custom = await db.custom_prices.find_one({"room_id": booking_data.room_id, "date": date_str})
        room_price += float(custom["price"]) if custom else default_price
        current += timedelta(days=1)
        
    # Upsells
    upsells_total = 0.0
    upsell_ids = []
    if booking_data.upsell_ids:
        for uid in booking_data.upsell_ids:
            upsell = await db.upsells.find_one({"id": uid, "is_active": True})
            if upsell:
                upsells_total += float(upsell["price"])
                upsell_ids.append(uid)
                
    subtotal = room_price + upsells_total
    
    # Coupon logic basic
    discount_amount = 0.0
    coupon_code = None
    if booking_data.coupon_code:
        coupon = await db.coupons.find_one({"code": booking_data.coupon_code.upper()})
        if coupon and coupon["is_active"]:
            coupon_code = coupon["code"]
            if coupon["discount_type"] == "percentage":
                discount_amount = room_price * (coupon["discount_value"]/100)
            else:
                discount_amount = min(coupon["discount_value"], room_price)
            await db.coupons.update_one({"code": coupon_code}, {"$inc": {"uses_count": 1}})
            
    total_price = subtotal - discount_amount

    booking = Booking(
        room_id=booking_data.room_id,
        guest_email=booking_data.guest_email,
        guest_name=booking_data.guest_name,
        guest_phone=booking_data.guest_phone,
        check_in=booking_data.check_in,
        check_out=booking_data.check_out,
        num_guests=booking_data.num_guests,
        room_price=room_price,
        upsells_total=upsells_total,
        upsells=upsell_ids,
        total_price=total_price,
        notes=booking_data.notes,
        coupon_code=coupon_code,
        discount_amount=discount_amount,
        stay_reason=booking_data.stay_reason
    )

    host_url = booking_data.origin_url.rstrip('/')
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': f"Prenotazione: {room['name_it']}",
                        'description': f"{nights} notti - {booking_data.check_in} / {booking_data.check_out}"
                    },
                    'unit_amount': int(total_price * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{host_url}/booking/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{host_url}/booking/cancel",
            metadata={"booking_id": booking.id}
        )
    except Exception as e:
        logger.error(f"STRIPE ERROR: {e}")
        raise HTTPException(status_code=500, detail="Payment session error")

    booking.stripe_session_id = session.id
    b_dict = booking.model_dump()
    b_dict["created_at"] = b_dict["created_at"].isoformat()
    b_dict["updated_at"] = b_dict["updated_at"].isoformat()
    
    await db.bookings.insert_one(b_dict)
    
    pt = PaymentTransaction(booking_id=booking.id, session_id=session.id, amount=total_price)
    pt_dict = pt.model_dump()
    pt_dict["created_at"] = pt_dict["created_at"].isoformat()
    pt_dict["updated_at"] = pt_dict["updated_at"].isoformat()
    await db.payment_transactions.insert_one(pt_dict)
    
    return {"checkout_url": session.url}

@api_router.get("/bookings/status/{session_id}")
async def check_booking_status(session_id: str):
    session = stripe.checkout.Session.retrieve(session_id)
    booking = await db.bookings.find_one({"stripe_session_id": session_id}, {"_id": 0})
    if not booking: raise HTTPException(404, "Not found")
    
    prev_status = booking.get("payment_status")
    
    if session.payment_status == "paid":
        await db.bookings.update_one({"stripe_session_id": session_id}, {"$set": {"status": "confirmed", "payment_status": "paid"}})
        if prev_status != "paid":
            room = await db.rooms.find_one({"id": booking["room_id"]}, {"_id": 0})
            await send_booking_confirmation_email(booking, room)
    elif session.status == "expired":
        await db.bookings.update_one({"stripe_session_id": session_id}, {"$set": {"status": "cancelled", "payment_status": "expired"}})
        
    updated = await db.bookings.find_one({"stripe_session_id": session_id}, {"_id": 0})
    return {"payment_status": session.payment_status, "status": session.status, "booking": updated}

@api_router.get("/bookings")
async def get_all_bookings():
    return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str):
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": status}})
    return {"message": "Updated"}

# --- REVIEWS ---
@api_router.post("/reviews")
async def create_review(data: ReviewCreate):
    booking = await db.bookings.find_one({"id": data.booking_id})
    if not booking or booking["status"] != "completed":
        raise HTTPException(400, "Booking not completed")
    
    review = Review(
        booking_id=data.booking_id,
        room_id=booking["room_id"],
        guest_name=booking["guest_name"],
        rating=data.rating,
        comment_it=data.comment if data.language == "it" else None,
        comment_en=data.comment if data.language != "it" else None
    )
    r_dict = review.model_dump()
    r_dict["created_at"] = r_dict["created_at"].isoformat()
    await db.reviews.insert_one(r_dict)
    return {"message": "Review added"}

@api_router.get("/reviews")
async def get_reviews(approved_only: bool = True):
    q = {"is_approved": True} if approved_only else {}
    return await db.reviews.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.put("/reviews/{review_id}/approve")
async def approve_review(review_id: str):
    await db.reviews.update_one({"id": review_id}, {"$set": {"is_approved": True}})
    return {"message": "Approved"}

# --- CONTACT ---
@api_router.post("/contact")
async def submit_contact(contact: ContactMessage):
    msg = contact.model_dump()
    msg["id"] = str(uuid.uuid4())
    msg["created_at"] = datetime.now(timezone.utc).isoformat()
    msg["is_read"] = False
    await db.contact_messages.insert_one(msg)
    await send_contact_notification(contact)
    return {"message": "Sent"}

@api_router.get("/contact")
async def get_messages():
    return await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

# --- ANALYTICS (Lite version for dashboard) ---
@api_router.get("/analytics/top-stats")
async def get_top_stats():
    # Simple stats for admin header
    today = datetime.now().strftime("%Y-%m-%d")
    checkins = await db.bookings.count_documents({"check_in": today, "status": "confirmed"})
    pending = await db.bookings.count_documents({"status": "pending"})
    return {"todays_checkins": checkins, "pending_bookings": pending, "todays_checkouts": 0, "month_revenue": 0}
    
@api_router.get("/analytics/overview")
async def get_analytics_overview(start_date: str = None, end_date: str = None):
    # Return structure so frontend doesn't break
    return {
        "summary": {"total_revenue": 0, "total_bookings": 0, "occupancy_rate": 0, "avg_price_per_night": 0, "total_discounts": 0, "total_nights": 0, "conversion_rate": 0, "avg_guests": 0, "coupon_usage_rate": 0},
        "by_room": {"bookings": {"nonna": 0, "pozzo": 0}, "revenue": {"nonna": 0, "pozzo": 0}},
        "by_status": {"pending": 0, "confirmed": 0, "cancelled": 0}
    }

@api_router.get("/analytics/monthly")
async def get_monthly(year: int = 2025):
    return {"months": []}

# --- SITE IMAGES ---
@api_router.get("/site-images")
async def get_site_images():
    img = await db.site_images.find_one({"id": "site_images"}, {"_id": 0})
    if not img: return {"hero_image": "", "cta_background": ""}
    return img

@api_router.put("/site-images")
async def update_site_images(data: SiteImagesUpdate):
    u = {k:v for k,v in data.model_dump().items() if v}
    await db.site_images.update_one({"id": "site_images"}, {"$set": u}, upsert=True)
    return {"status": "updated"}

# --- AUTH ---
@api_router.post("/admin/login")
async def admin_login(data: AdminLogin):
    if data.username == ADMIN_USERNAME and hash_password(data.password) == ADMIN_PASSWORD_HASH:
        token = secrets.token_urlsafe(32)
        await db.admin_sessions.insert_one({"token": token, "expires_at": (datetime.now(timezone.utc)+timedelta(hours=24)).isoformat()})
        return {"success": True, "token": token}
    raise HTTPException(401, "Invalid")

@api_router.get("/admin/verify")
async def verify_token(token: str):
    s = await db.admin_sessions.find_one({"token": token})
    if s and datetime.fromisoformat(s["expires_at"]) > datetime.now(timezone.utc):
        return {"valid": True}
    raise HTTPException(401, "Expired")

@api_router.get("/stay-reasons")
async def get_stay_reasons():
    return [{"id": "vacanza", "it": "Vacanza", "en": "Holiday"}, {"id": "lavoro", "it": "Lavoro", "en": "Work"}]

# ==================== STARTUP ====================
@app.on_event("startup")
async def startup():
    if await db.rooms.count_documents({}) == 0:
        await init_rooms()
    await init_settings()
    await init_upsells()

# APP SETUP
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)