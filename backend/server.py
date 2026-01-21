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
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, date, timedelta
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import resend


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'prenotazioni@desideridipuglia.com')

# Admin credentials
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH', '')

# Create the main app without a prefix
app = FastAPI()
security = HTTPBasic()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== AUTH FUNCTIONS ====================

def hash_password(password: str) -> str:
    """Hash password with SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin credentials"""
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

# ==================== MODELS ====================

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
    check_in: str  # ISO date string
    check_out: str  # ISO date string
    num_guests: int
    total_price: float
    room_price: float = 0.0  # Base room price
    upsells_total: float = 0.0  # Total upsells price
    upsells: List[str] = []  # List of upsell IDs
    status: str = "pending"  # pending, confirmed, cancelled, completed
    payment_status: str = "pending"  # pending, paid, refunded
    stripe_session_id: Optional[str] = None
    notes: Optional[str] = None
    stay_reason: Optional[str] = None  # Motivo del soggiorno
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
    rating: int  # 1-5
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
    status: str = "initiated"  # initiated, paid, failed, expired
    payment_status: str = "pending"
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomPrice(BaseModel):
    """Custom price for specific date and room"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    date: str  # ISO date string
    price: float
    reason: Optional[str] = None  # e.g., "Alta stagione", "Evento speciale"

class CustomPriceCreate(BaseModel):
    room_id: str
    start_date: str
    end_date: str
    price: float
    reason: Optional[str] = None

class Upsell(BaseModel):
    """Upsell/Extra item"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str  # unique identifier
    title_it: str
    title_en: str
    description_it: str  # Persuasive copy
    description_en: str
    price: float
    min_nights: int = 0  # Minimum nights to show this upsell (0 = always)
    is_active: bool = True
    order: int = 0
    icon: str = "gift"  # Icon name for frontend
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
    date: str  # ISO date string
    reason: Optional[str] = None

class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # Unique coupon code
    discount_type: str = "percentage"  # percentage or fixed
    discount_value: float  # 10 = 10% or €10
    min_nights: int = 1  # Minimum nights required
    max_uses: Optional[int] = None  # None = unlimited
    uses_count: int = 0
    valid_from: Optional[str] = None  # ISO date
    valid_until: Optional[str] = None  # ISO date
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

class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    default_price_nonna: float = 80.0
    default_price_pozzo: float = 80.0
    min_nights: int = 1
    check_in_time: str = "13:00"
    check_out_time: str = "10:30"


# ==================== EMAIL FUNCTIONS ====================

def generate_booking_confirmation_email(booking: dict, room: dict, language: str = "it") -> str:
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
        guests_label = "Ospiti"
        total_label = "Totale pagato"
        checkin_info = "Orario check-in: dalle 13:00 alle 00:00"
        checkout_info = "Orario check-out: dalle 10:00 alle 10:30"
        address_title = "Indirizzo"
        contact_title = "Contatti"
        footer_text = "Ti aspettiamo a Barletta!"
        note_text = "Ricorda di portare un documento di identità al check-in."
    else:
        subject = f"Booking Confirmation - Desideri di Puglia"
        greeting = f"Dear {booking['guest_name']},"
        intro = "Thank you for choosing Desideri di Puglia! Your booking is confirmed."
        details_title = "Booking Details"
        room_label = "Room"
        checkin_label = "Check-in"
        checkout_label = "Check-out"
        guests_label = "Guests"
        total_label = "Total paid"
        checkin_info = "Check-in time: 1:00 PM to 12:00 AM"
        checkout_info = "Check-out time: 10:00 AM to 10:30 AM"
        address_title = "Address"
        contact_title = "Contact"
        footer_text = "We look forward to welcoming you in Barletta!"
        note_text = "Please remember to bring an ID for check-in."
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #F9F8F4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9F8F4; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #E5E0D8;">
                        <!-- Header -->
                        <tr>
                            <td style="background-color: #0A2342; padding: 40px; text-align: center;">
                                <h1 style="color: #C5A059; margin: 0; font-size: 28px; font-weight: normal; letter-spacing: 2px;">
                                    DESIDERI DI PUGLIA
                                </h1>
                                <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;">
                                    Boutique B&B
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="color: #0A2342; font-size: 18px; margin: 0 0 20px 0;">
                                    {greeting}
                                </p>
                                <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    {intro}
                                </p>
                                
                                <!-- Booking Details Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9F8F4; border: 1px solid #E5E0D8; margin-bottom: 30px;">
                                    <tr>
                                        <td style="padding: 20px; border-bottom: 1px solid #E5E0D8;">
                                            <h2 style="color: #0A2342; font-size: 16px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                                                {details_title}
                                            </h2>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px;">
                                            <table width="100%" cellpadding="8" cellspacing="0">
                                                <tr>
                                                    <td style="color: #666666; width: 40%;">{room_label}</td>
                                                    <td style="color: #0A2342; font-weight: bold;">{room_name}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666666;">{checkin_label}</td>
                                                    <td style="color: #0A2342; font-weight: bold;">{booking['check_in']}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666666;">{checkout_label}</td>
                                                    <td style="color: #0A2342; font-weight: bold;">{booking['check_out']}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666666;">{guests_label}</td>
                                                    <td style="color: #0A2342; font-weight: bold;">{booking['num_guests']}</td>
                                                </tr>
                                                <tr style="border-top: 1px solid #E5E0D8;">
                                                    <td style="color: #666666; padding-top: 15px;">{total_label}</td>
                                                    <td style="color: #C5A059; font-weight: bold; font-size: 20px; padding-top: 15px;">€{booking['total_price']}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Check-in/out Info -->
                                <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #0A2342; margin-bottom: 30px;">
                                    <tr>
                                        <td style="color: #ffffff; text-align: center;">
                                            <p style="margin: 0 0 5px 0; font-size: 14px;">{checkin_info}</p>
                                            <p style="margin: 0; font-size: 14px;">{checkout_info}</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Address -->
                                <h3 style="color: #0A2342; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0;">
                                    {address_title}
                                </h3>
                                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                                    Via Borgo Vecchio 65<br>
                                    76121 Barletta (BT), Italia
                                </p>
                                
                                <!-- Note -->
                                <p style="color: #C5A059; font-size: 14px; font-style: italic; margin: 0 0 30px 0; padding: 15px; border-left: 3px solid #C5A059; background-color: #F9F8F4;">
                                    {note_text}
                                </p>
                                
                                <p style="color: #0A2342; font-size: 16px; margin: 0;">
                                    {footer_text}
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #0A2342; padding: 30px; text-align: center;">
                                <p style="color: #C5A059; margin: 0 0 10px 0; font-size: 14px;">
                                    Desideri di Puglia
                                </p>
                                <p style="color: #ffffff; margin: 0; font-size: 12px; opacity: 0.7;">
                                    Via Borgo Vecchio 65, 76121 Barletta (BT), Italia
                                </p>
                                <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">
                                    info@desideridipuglia.it
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return subject, html


async def send_booking_confirmation_email(booking: dict, room: dict, language: str = "it"):
    """Send booking confirmation email"""
    try:
        subject, html_content = generate_booking_confirmation_email(booking, room, language)
        
        params = {
            "from": SENDER_EMAIL,
            "to": [booking["guest_email"]],
            "subject": subject,
            "html": html_content
        }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Confirmation email sent to {booking['guest_email']}, ID: {email_result.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {str(e)}")
        return False


# ==================== INITIALIZATION ====================

async def init_rooms():
    """Initialize default rooms if they don't exist"""
    rooms_count = await db.rooms.count_documents({})
    if rooms_count == 0:
        default_rooms = [
            {
                "id": "nonna",
                "slug": "stanza-della-nonna",
                "name_it": "Stanza della Nonna",
                "name_en": "Grandmother's Room",
                "description_it": "Un rifugio intimo che celebra la tradizione pugliese. Pareti in pietra locale, arredi d'epoca restaurati e tessuti pregiati creano un'atmosfera di calore autentico. La luce naturale filtra attraverso le persiane in legno, illuminando ogni dettaglio con dolcezza.",
                "description_en": "An intimate retreat celebrating Apulian tradition. Local stone walls, restored antique furnishings and fine fabrics create an atmosphere of authentic warmth. Natural light filters through wooden shutters, gently illuminating every detail.",
                "price_per_night": 80.0,
                "max_guests": 3,
                "images": [
                    {"id": "nonna-1", "url": "https://images.unsplash.com/photo-1730322011993-592266c14831?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwdWdsaWElMjBiZWRyb29tJTIwc3RvbmUlMjB3YWxscyUyMGludGVyaW9yfGVufDB8fHx8MTc2ODg4NTYyNHww&ixlib=rb-4.1.0&q=85", "alt_it": "Camera con pareti in pietra", "alt_en": "Room with stone walls", "order": 0},
                    {"id": "nonna-2", "url": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800", "alt_it": "Letto matrimoniale", "alt_en": "Double bed", "order": 1},
                    {"id": "nonna-3", "url": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800", "alt_it": "Bagno privato", "alt_en": "Private bathroom", "order": 2},
                ],
                "amenities": ["wifi", "ac", "kitchen", "tv", "bathroom", "breakfast"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "pozzo",
                "slug": "stanza-del-pozzo",
                "name_it": "Stanza del Pozzo",
                "name_en": "Well Room",
                "description_it": "Un'oasi di pace dove storia e comfort si incontrano. L'antico pozzo, elemento distintivo di questo spazio, racconta secoli di storia. Soffitti a volta, pietra a vista e un design contemporaneo si fondono in un equilibrio perfetto.",
                "description_en": "An oasis of peace where history and comfort meet. The ancient well, a distinctive element of this space, tells centuries of history. Vaulted ceilings, exposed stone and contemporary design blend in perfect balance.",
                "price_per_night": 80.0,
                "max_guests": 3,
                "images": [
                    {"id": "pozzo-1", "url": "https://images.unsplash.com/photo-1730322046135-a754d71b7ec0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjBwdWdsaWElMjBiZWRyb29tJTIwc3RvbmUlMjB3YWxscyUyMGludGVyaW9yfGVufDB8fHx8MTc2ODg4NTYyNHww&ixlib=rb-4.1.0&q=85", "alt_it": "Camera rustica di lusso", "alt_en": "Rustic luxury room", "order": 0},
                    {"id": "pozzo-2", "url": "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800", "alt_it": "Zona soggiorno", "alt_en": "Living area", "order": 1},
                    {"id": "pozzo-3", "url": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800", "alt_it": "Cucina attrezzata", "alt_en": "Equipped kitchen", "order": 2},
                ],
                "amenities": ["wifi", "ac", "kitchen", "tv", "bathroom", "breakfast"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.rooms.insert_many(default_rooms)
        logger.info("Default rooms initialized")

async def init_settings():
    """Initialize default settings if they don't exist"""
    settings = await db.settings.find_one({"id": "settings"})
    if not settings:
        default_settings = {
            "id": "settings",
            "default_price_nonna": 80.0,
            "default_price_pozzo": 80.0,
            "min_nights": 1,
            "check_in_time": "13:00",
            "check_out_time": "10:30"
        }
        await db.settings.insert_one(default_settings)
        logger.info("Default settings initialized")


# ==================== ROOM ENDPOINTS ====================

@api_router.get("/rooms", response_model=List[dict])
async def get_rooms():
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    return rooms

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


# ==================== AVAILABILITY ENDPOINTS ====================

@api_router.get("/availability/{room_id}")
async def get_availability(room_id: str, start_date: str, end_date: str):
    """Get available dates for a room within a date range"""
    # Get all bookings for this room in the date range
    bookings = await db.bookings.find({
        "room_id": room_id,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"check_in": {"$lte": end_date}, "check_out": {"$gte": start_date}}
        ]
    }, {"_id": 0}).to_list(1000)
    
    # Get blocked dates
    blocked = await db.blocked_dates.find({
        "room_id": room_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    
    # Calculate unavailable dates
    unavailable_dates = set()
    for booking in bookings:
        current = datetime.strptime(booking["check_in"], "%Y-%m-%d")
        end = datetime.strptime(booking["check_out"], "%Y-%m-%d")
        while current < end:
            unavailable_dates.add(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)
    
    for block in blocked:
        unavailable_dates.add(block["date"])
    
    return {"unavailable_dates": list(unavailable_dates)}

@api_router.post("/blocked-dates")
async def add_blocked_date(room_id: str, date: str, reason: Optional[str] = None):
    blocked = BlockedDate(room_id=room_id, date=date, reason=reason)
    await db.blocked_dates.insert_one(blocked.model_dump())
    return {"message": "Date blocked successfully"}

@api_router.delete("/blocked-dates/{room_id}/{date}")
async def remove_blocked_date(room_id: str, date: str):
    await db.blocked_dates.delete_one({"room_id": room_id, "date": date})
    return {"message": "Date unblocked successfully"}

@api_router.get("/blocked-dates/{room_id}")
async def get_blocked_dates(room_id: str):
    """Get all blocked dates for a room"""
    blocked = await db.blocked_dates.find({"room_id": room_id}, {"_id": 0}).to_list(1000)
    return blocked

@api_router.post("/blocked-dates/range")
async def block_date_range(room_id: str, start_date: str, end_date: str, reason: Optional[str] = None):
    """Block a range of dates"""
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
    
    return {"message": f"{blocked_count} dates blocked successfully"}


# ==================== COUPON ENDPOINTS ====================

@api_router.post("/coupons")
async def create_coupon(coupon_data: CouponCreate):
    """Create a new coupon"""
    # Check if code already exists
    existing = await db.coupons.find_one({"code": coupon_data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon = Coupon(
        code=coupon_data.code.upper(),
        discount_type=coupon_data.discount_type,
        discount_value=coupon_data.discount_value,
        min_nights=coupon_data.min_nights,
        max_uses=coupon_data.max_uses,
        valid_from=coupon_data.valid_from,
        valid_until=coupon_data.valid_until,
        description_it=coupon_data.description_it,
        description_en=coupon_data.description_en
    )
    
    coupon_dict = coupon.model_dump()
    coupon_dict["created_at"] = coupon_dict["created_at"].isoformat()
    await db.coupons.insert_one(coupon_dict)
    
    return {"message": "Coupon created successfully", "coupon_id": coupon.id}

@api_router.get("/coupons")
async def get_all_coupons():
    """Get all coupons (admin)"""
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(100)
    return coupons

@api_router.get("/coupons/validate/{code}")
async def validate_coupon(code: str, nights: int = 1):
    """Validate a coupon code"""
    coupon = await db.coupons.find_one({"code": code.upper(), "is_active": True}, {"_id": 0})
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found or inactive")
    
    # Check minimum nights
    if nights < coupon.get("min_nights", 1):
        raise HTTPException(
            status_code=400, 
            detail=f"Minimum {coupon['min_nights']} nights required for this coupon"
        )
    
    # Check max uses
    if coupon.get("max_uses") and coupon.get("uses_count", 0) >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="Coupon has reached maximum uses")
    
    # Check validity dates
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if coupon.get("valid_from") and today < coupon["valid_from"]:
        raise HTTPException(status_code=400, detail="Coupon not yet valid")
    if coupon.get("valid_until") and today > coupon["valid_until"]:
        raise HTTPException(status_code=400, detail="Coupon has expired")
    
    return {
        "valid": True,
        "discount_type": coupon["discount_type"],
        "discount_value": coupon["discount_value"],
        "description_it": coupon.get("description_it"),
        "description_en": coupon.get("description_en")
    }

@api_router.put("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, is_active: Optional[bool] = None):
    """Update coupon (toggle active status)"""
    update_data = {}
    if is_active is not None:
        update_data["is_active"] = is_active
    
    if update_data:
        await db.coupons.update_one({"id": coupon_id}, {"$set": update_data})
    
    return {"message": "Coupon updated successfully"}

@api_router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str):
    """Delete a coupon"""
    await db.coupons.delete_one({"id": coupon_id})
    return {"message": "Coupon deleted successfully"}


# ==================== BOOKING ENDPOINTS ====================

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate, request: Request):
    """Create a booking and initiate Stripe checkout"""
    # Validate room exists
    room = await db.rooms.find_one({"id": booking_data.room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Check availability
    check_in = datetime.strptime(booking_data.check_in, "%Y-%m-%d")
    check_out = datetime.strptime(booking_data.check_out, "%Y-%m-%d")
    
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="Check-out must be after check-in")
    
    nights = (check_out - check_in).days
    subtotal = float(room["price_per_night"]) * nights
    discount_amount = 0.0
    coupon_code = None
    
    # Apply coupon if provided
    if booking_data.coupon_code:
        coupon = await db.coupons.find_one({"code": booking_data.coupon_code.upper(), "is_active": True}, {"_id": 0})
        if coupon:
            # Validate coupon
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            is_valid = True
            
            if nights < coupon.get("min_nights", 1):
                is_valid = False
            if coupon.get("max_uses") and coupon.get("uses_count", 0) >= coupon["max_uses"]:
                is_valid = False
            if coupon.get("valid_from") and today < coupon["valid_from"]:
                is_valid = False
            if coupon.get("valid_until") and today > coupon["valid_until"]:
                is_valid = False
            
            if is_valid:
                coupon_code = coupon["code"]
                if coupon["discount_type"] == "percentage":
                    discount_amount = subtotal * (coupon["discount_value"] / 100)
                else:  # fixed
                    discount_amount = min(coupon["discount_value"], subtotal)
                
                # Increment coupon usage
                await db.coupons.update_one(
                    {"code": coupon["code"]},
                    {"$inc": {"uses_count": 1}}
                )
    
    total_price = subtotal - discount_amount
    
    # Check for conflicting bookings
    existing = await db.bookings.find_one({
        "room_id": booking_data.room_id,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"check_in": {"$lt": booking_data.check_out}, "check_out": {"$gt": booking_data.check_in}}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Room not available for selected dates")
    
    # Create booking
    booking = Booking(
        room_id=booking_data.room_id,
        guest_email=booking_data.guest_email,
        guest_name=booking_data.guest_name,
        guest_phone=booking_data.guest_phone,
        check_in=booking_data.check_in,
        check_out=booking_data.check_out,
        num_guests=booking_data.num_guests,
        total_price=total_price,
        notes=booking_data.notes,
        coupon_code=coupon_code,
        discount_amount=discount_amount
    )
    
    # Create Stripe checkout session
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    host_url = booking_data.origin_url.rstrip('/')
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    success_url = f"{host_url}/booking/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/booking/cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=total_price,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking.id,
            "room_id": booking_data.room_id,
            "guest_email": booking_data.guest_email,
            "check_in": booking_data.check_in,
            "check_out": booking_data.check_out
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Update booking with session ID
    booking.stripe_session_id = session.session_id
    booking_dict = booking.model_dump()
    booking_dict["created_at"] = booking_dict["created_at"].isoformat()
    booking_dict["updated_at"] = booking_dict["updated_at"].isoformat()
    
    await db.bookings.insert_one(booking_dict)
    
    # Create payment transaction record
    payment_transaction = PaymentTransaction(
        booking_id=booking.id,
        session_id=session.session_id,
        amount=total_price,
        currency="eur",
        status="initiated",
        payment_status="pending",
        metadata={
            "guest_email": booking_data.guest_email,
            "room_id": booking_data.room_id
        }
    )
    pt_dict = payment_transaction.model_dump()
    pt_dict["created_at"] = pt_dict["created_at"].isoformat()
    pt_dict["updated_at"] = pt_dict["updated_at"].isoformat()
    await db.payment_transactions.insert_one(pt_dict)
    
    return {
        "booking_id": booking.id,
        "checkout_url": session.url,
        "session_id": session.session_id,
        "total_price": total_price,
        "nights": nights
    }

@api_router.get("/bookings/status/{session_id}")
async def check_booking_status(session_id: str, request: Request):
    """Check payment status and update booking"""
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Get booking before update to check if email was already sent
        booking = await db.bookings.find_one({"stripe_session_id": session_id}, {"_id": 0})
        previous_status = booking.get("payment_status") if booking else None
        
        # Update booking status
        if status.payment_status == "paid":
            await db.bookings.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "status": "confirmed",
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "paid",
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Send confirmation email only if this is the first time payment is confirmed
            if previous_status != "paid" and booking:
                room = await db.rooms.find_one({"id": booking["room_id"]}, {"_id": 0})
                if room:
                    await send_booking_confirmation_email(booking, room, "it")
                    
        elif status.status == "expired":
            await db.bookings.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "status": "cancelled",
                    "payment_status": "expired",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "expired",
                    "payment_status": "expired",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        booking = await db.bookings.find_one({"stripe_session_id": session_id}, {"_id": 0})
        
        return {
            "payment_status": status.payment_status,
            "status": status.status,
            "booking": booking
        }
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        raise HTTPException(status_code=500, detail="Error checking payment status")

@api_router.get("/bookings")
async def get_all_bookings():
    """Admin endpoint to get all bookings"""
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str):
    """Admin endpoint to update booking status"""
    valid_statuses = ["pending", "confirmed", "cancelled", "completed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Booking status updated"}

@api_router.post("/bookings/{booking_id}/resend-confirmation")
async def resend_booking_confirmation(booking_id: str):
    """Admin endpoint to resend confirmation email"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["payment_status"] != "paid":
        raise HTTPException(status_code=400, detail="Cannot send confirmation for unpaid booking")
    
    room = await db.rooms.find_one({"id": booking["room_id"]}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    success = await send_booking_confirmation_email(booking, room, "it")
    
    if success:
        return {"message": "Confirmation email sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")


# ==================== STRIPE WEBHOOK ====================

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Get booking before update
            booking = await db.bookings.find_one(
                {"stripe_session_id": webhook_response.session_id}, 
                {"_id": 0}
            )
            previous_status = booking.get("payment_status") if booking else None
            
            await db.bookings.update_one(
                {"stripe_session_id": webhook_response.session_id},
                {"$set": {
                    "status": "confirmed",
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "status": "paid",
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Send confirmation email if first time confirmed
            if previous_status != "paid" and booking:
                room = await db.rooms.find_one({"id": booking["room_id"]}, {"_id": 0})
                if room:
                    await send_booking_confirmation_email(booking, room, "it")
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


# ==================== REVIEW ENDPOINTS ====================

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate):
    """Create a review (only for completed bookings)"""
    # Verify booking exists and is completed
    booking = await db.bookings.find_one({"id": review_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed stays")
    
    # Check if review already exists
    existing = await db.reviews.find_one({"booking_id": review_data.booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Review already exists for this booking")
    
    review = Review(
        booking_id=review_data.booking_id,
        room_id=booking["room_id"],
        guest_name=booking["guest_name"],
        rating=min(5, max(1, review_data.rating))
    )
    
    if review_data.language == "it":
        review.comment_it = review_data.comment
    else:
        review.comment_en = review_data.comment
    
    review_dict = review.model_dump()
    review_dict["created_at"] = review_dict["created_at"].isoformat()
    await db.reviews.insert_one(review_dict)
    
    return {"message": "Review submitted successfully", "review_id": review.id}

@api_router.get("/reviews")
async def get_reviews(room_id: Optional[str] = None, approved_only: bool = True):
    """Get reviews, optionally filtered by room"""
    query = {}
    if room_id:
        query["room_id"] = room_id
    if approved_only:
        query["is_approved"] = True
    
    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews

@api_router.put("/reviews/{review_id}/approve")
async def approve_review(review_id: str):
    """Admin endpoint to approve a review"""
    await db.reviews.update_one({"id": review_id}, {"$set": {"is_approved": True}})
    return {"message": "Review approved"}


# ==================== SETTINGS ENDPOINTS ====================

@api_router.get("/settings")
async def get_settings():
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings:
        await init_settings()
        settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    return settings

@api_router.put("/settings")
async def update_settings(settings: dict):
    await db.settings.update_one({"id": "settings"}, {"$set": settings}, upsert=True)
    return await db.settings.find_one({"id": "settings"}, {"_id": 0})


# ==================== CONTACT ENDPOINT ====================

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    message: str
    language: str = "it"

@api_router.post("/contact")
async def submit_contact(contact: ContactMessage):
    """Submit a contact message"""
    contact_dict = contact.model_dump()
    contact_dict["id"] = str(uuid.uuid4())
    contact_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    contact_dict["is_read"] = False
    await db.contact_messages.insert_one(contact_dict)
    return {"message": "Message sent successfully"}

@api_router.get("/contact")
async def get_contact_messages():
    """Admin endpoint to get contact messages"""
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return messages


# ==================== AUTH ENDPOINTS ====================

@api_router.post("/admin/login")
async def admin_login(login_data: AdminLogin):
    """Verify admin credentials and return token"""
    password_hash = hash_password(login_data.password)
    
    if login_data.username == ADMIN_USERNAME and password_hash == ADMIN_PASSWORD_HASH:
        # Generate a simple session token
        token = secrets.token_urlsafe(32)
        # Store token in DB with expiry
        await db.admin_sessions.delete_many({})  # Clear old sessions
        await db.admin_sessions.insert_one({
            "token": token,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        })
        return {"success": True, "token": token}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/admin/verify")
async def verify_admin_token(token: str):
    """Verify if admin token is valid"""
    session = await db.admin_sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if datetime.fromisoformat(session["expires_at"]) < datetime.now(timezone.utc):
        await db.admin_sessions.delete_one({"token": token})
        raise HTTPException(status_code=401, detail="Token expired")
    
    return {"valid": True}

@api_router.post("/admin/logout")
async def admin_logout(token: str):
    """Logout admin"""
    await db.admin_sessions.delete_one({"token": token})
    return {"success": True}


# ==================== SITE IMAGES ENDPOINTS ====================

@api_router.get("/site-images")
async def get_site_images():
    """Get site images configuration"""
    images = await db.site_images.find_one({"id": "site_images"}, {"_id": 0})
    if not images:
        # Create default
        default = SiteImages()
        default_dict = default.model_dump()
        default_dict["updated_at"] = default_dict["updated_at"].isoformat()
        await db.site_images.insert_one(default_dict)
        images = await db.site_images.find_one({"id": "site_images"}, {"_id": 0})
    return images

@api_router.put("/site-images")
async def update_site_images(update: SiteImagesUpdate):
    """Update site images"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.site_images.update_one(
            {"id": "site_images"}, 
            {"$set": update_data}, 
            upsert=True
        )
    return await db.site_images.find_one({"id": "site_images"}, {"_id": 0})


# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/overview")
async def get_analytics_overview(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get analytics overview with optional date filters"""
    
    # Default to current year if no dates provided
    if not start_date:
        start_date = f"{datetime.now().year}-01-01"
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    
    # Get all bookings in date range
    bookings = await db.bookings.find({
        "created_at": {"$gte": start_date, "$lte": end_date + "T23:59:59"},
        "status": {"$in": ["confirmed", "completed"]}
    }, {"_id": 0}).to_list(10000)
    
    # Get all bookings (including pending for comparison)
    all_bookings = await db.bookings.find({
        "created_at": {"$gte": start_date, "$lte": end_date + "T23:59:59"}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    total_bookings = len(bookings)
    total_revenue = sum(b.get("total_price", 0) for b in bookings)
    total_discounts = sum(b.get("discount_amount", 0) for b in bookings)
    
    # Calculate nights
    total_nights = 0
    for b in bookings:
        try:
            check_in = datetime.strptime(b["check_in"], "%Y-%m-%d")
            check_out = datetime.strptime(b["check_out"], "%Y-%m-%d")
            total_nights += (check_out - check_in).days
        except:
            pass
    
    # Average price per night
    avg_price_per_night = total_revenue / total_nights if total_nights > 0 else 0
    
    # Occupancy rate calculation
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    total_available_nights = (end_dt - start_dt).days * 2  # 2 rooms
    occupancy_rate = (total_nights / total_available_nights * 100) if total_available_nights > 0 else 0
    
    # Bookings by room
    bookings_by_room = {"nonna": 0, "pozzo": 0}
    revenue_by_room = {"nonna": 0, "pozzo": 0}
    for b in bookings:
        room_id = b.get("room_id", "")
        if room_id in bookings_by_room:
            bookings_by_room[room_id] += 1
            revenue_by_room[room_id] += b.get("total_price", 0)
    
    # Bookings by status
    status_counts = {"pending": 0, "confirmed": 0, "cancelled": 0, "completed": 0}
    for b in all_bookings:
        status = b.get("status", "pending")
        if status in status_counts:
            status_counts[status] += 1
    
    # Conversion rate (confirmed+completed / total)
    total_all = len(all_bookings)
    conversion_rate = ((status_counts["confirmed"] + status_counts["completed"]) / total_all * 100) if total_all > 0 else 0
    
    # Average guests
    avg_guests = sum(b.get("num_guests", 1) for b in bookings) / total_bookings if total_bookings > 0 else 0
    
    # Coupon usage
    bookings_with_coupon = len([b for b in bookings if b.get("coupon_code")])
    coupon_usage_rate = (bookings_with_coupon / total_bookings * 100) if total_bookings > 0 else 0
    
    return {
        "period": {"start_date": start_date, "end_date": end_date},
        "summary": {
            "total_bookings": total_bookings,
            "total_revenue": round(total_revenue, 2),
            "total_discounts": round(total_discounts, 2),
            "net_revenue": round(total_revenue, 2),
            "total_nights": total_nights,
            "avg_price_per_night": round(avg_price_per_night, 2),
            "occupancy_rate": round(occupancy_rate, 1),
            "conversion_rate": round(conversion_rate, 1),
            "avg_guests": round(avg_guests, 1),
            "coupon_usage_rate": round(coupon_usage_rate, 1)
        },
        "by_room": {
            "bookings": bookings_by_room,
            "revenue": {k: round(v, 2) for k, v in revenue_by_room.items()}
        },
        "by_status": status_counts
    }

@api_router.get("/analytics/monthly")
async def get_monthly_analytics(year: int = None):
    """Get monthly breakdown for a year"""
    if not year:
        year = datetime.now().year
    
    monthly_data = []
    
    for month in range(1, 13):
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year}-12-31"
        else:
            end_date = f"{year}-{month+1:02d}-01"
        
        bookings = await db.bookings.find({
            "created_at": {"$gte": start_date, "$lt": end_date},
            "status": {"$in": ["confirmed", "completed"]}
        }, {"_id": 0}).to_list(1000)
        
        revenue = sum(b.get("total_price", 0) for b in bookings)
        
        # Calculate nights
        nights = 0
        for b in bookings:
            try:
                check_in = datetime.strptime(b["check_in"], "%Y-%m-%d")
                check_out = datetime.strptime(b["check_out"], "%Y-%m-%d")
                nights += (check_out - check_in).days
            except:
                pass
        
        # Days in month * 2 rooms
        import calendar
        days_in_month = calendar.monthrange(year, month)[1]
        available_nights = days_in_month * 2
        occupancy = (nights / available_nights * 100) if available_nights > 0 else 0
        
        monthly_data.append({
            "month": month,
            "month_name": calendar.month_name[month],
            "bookings": len(bookings),
            "revenue": round(revenue, 2),
            "nights": nights,
            "occupancy_rate": round(occupancy, 1)
        })
    
    return {"year": year, "months": monthly_data}

@api_router.get("/analytics/recent-bookings")
async def get_recent_bookings(limit: int = 10):
    """Get recent bookings for dashboard"""
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return bookings

@api_router.get("/analytics/top-stats")
async def get_top_stats():
    """Get quick stats for dashboard header"""
    today = datetime.now().strftime("%Y-%m-%d")
    month_start = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    year_start = f"{datetime.now().year}-01-01"
    
    # Today's check-ins
    todays_checkins = await db.bookings.count_documents({
        "check_in": today,
        "status": {"$in": ["confirmed", "completed"]}
    })
    
    # Today's check-outs
    todays_checkouts = await db.bookings.count_documents({
        "check_out": today,
        "status": {"$in": ["confirmed", "completed"]}
    })
    
    # Pending bookings
    pending_count = await db.bookings.count_documents({"status": "pending"})
    
    # This month revenue
    month_bookings = await db.bookings.find({
        "created_at": {"$gte": month_start},
        "status": {"$in": ["confirmed", "completed"]}
    }, {"_id": 0}).to_list(1000)
    month_revenue = sum(b.get("total_price", 0) for b in month_bookings)
    
    # Year revenue
    year_bookings = await db.bookings.find({
        "created_at": {"$gte": year_start},
        "status": {"$in": ["confirmed", "completed"]}
    }, {"_id": 0}).to_list(10000)
    year_revenue = sum(b.get("total_price", 0) for b in year_bookings)
    
    # Unread messages
    unread_messages = await db.contact_messages.count_documents({"is_read": False})
    
    # Pending reviews
    pending_reviews = await db.reviews.count_documents({"is_approved": False})
    
    return {
        "todays_checkins": todays_checkins,
        "todays_checkouts": todays_checkouts,
        "pending_bookings": pending_count,
        "month_revenue": round(month_revenue, 2),
        "year_revenue": round(year_revenue, 2),
        "month_bookings": len(month_bookings),
        "year_bookings": len(year_bookings),
        "unread_messages": unread_messages,
        "pending_reviews": pending_reviews
    }


# ==================== STARTUP ====================

@app.on_event("startup")
async def startup_event():
    await init_rooms()
    await init_settings()
    logger.info("Application startup complete")


# ==================== BASIC ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Desideri di Puglia API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
