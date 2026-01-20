from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, date, timedelta
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

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
    status: str = "pending"  # pending, confirmed, cancelled, completed
    payment_status: str = "pending"  # pending, paid, refunded
    stripe_session_id: Optional[str] = None
    notes: Optional[str] = None
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

class BlockedDate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    date: str  # ISO date string
    reason: Optional[str] = None

class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    default_price_nonna: float = 80.0
    default_price_pozzo: float = 80.0
    min_nights: int = 1
    check_in_time: str = "13:00"
    check_out_time: str = "10:30"


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
    total_price = float(room["price_per_night"]) * nights
    
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
        notes=booking_data.notes
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
