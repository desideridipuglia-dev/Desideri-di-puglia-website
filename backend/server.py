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
import requests
from ics import Calendar, Event  # Libreria per iCal

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ==================== CONFIGURATION ====================

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    mongo_url = os.environ.get('MONGO_URI', 'mongodb://localhost:27017')

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'desideri_db')]

# STRIPE CONFIGURATION
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY') 
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

# EMAIL CONFIGURATION (GMAIL SMTP)
SMTP_HOST = 'smtp.gmail.com'
SMTP_PORT = 587
# IMPORTANTISSIMO: Assicurati di aver impostato queste variabili su Render!
SMTP_USER = os.environ.get('EMAIL_USER') 
SMTP_PASSWORD = os.environ.get('EMAIL_PASS') 
SENDER_EMAIL = os.environ.get('EMAIL_USER') # Usa la stessa mail utente

# ADMIN CREDENTIALS
ADMIN_USERNAME = "admin"
plain_password = "pippo" 
ADMIN_PASSWORD_HASH = hashlib.sha256(plain_password.encode()).hexdigest()

# ==================== APP SETUP ====================

app = FastAPI()
security = HTTPBasic()
api_router = APIRouter(prefix="/api")

# Configurazione Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    ical_import_url: Optional[str] = "" # Link per IMPORTARE da Booking
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoomUpdate(BaseModel):
    price_per_night: Optional[float] = None
    description_it: Optional[str] = None
    description_en: Optional[str] = None
    images: Optional[List[RoomImage]] = None
    name_it: Optional[str] = None
    name_en: Optional[str] = None
    ical_import_url: Optional[str] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    guest_email: str
    guest_name: str
    check_in: str
    check_out: str
    num_guests: int
    total_price: float
    status: str = "pending" # pending, confirmed, cancelled
    source: str = "website" # website, booking_ical, airbnb_ical
    stripe_session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    room_id: str
    guest_email: EmailStr
    guest_name: str
    check_in: str
    check_out: str
    num_guests: int
    origin_url: str # Per il redirect di Stripe

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    message: str

# ==================== EMAIL LOGIC (GMAIL) ====================

def _send_email_sync(to_email: str, subject: str, html_content: str):
    """Invia email usando Gmail SMTP (Funzione Sincrona)"""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.error("❌ ERRORE EMAIL: Credenziali Gmail mancanti su Render!")
        return False
        
    try:
        msg = MIMEMultipart()
        msg['From'] = f"Desideri di Puglia <{SMTP_USER}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"✅ EMAIL INVIATA a {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ ERRORE INVIO EMAIL a {to_email}: {str(e)}")
        return False

async def send_booking_confirmation_email(booking: dict, room: dict):
    subject = "Conferma Prenotazione - Desideri di Puglia"
    html = f"""
    <h1>Grazie {booking['guest_name']}!</h1>
    <p>La tua prenotazione per <strong>{room['name_it']}</strong> è confermata.</p>
    <p><strong>Check-in:</strong> {booking['check_in']}</p>
    <p><strong>Check-out:</strong> {booking['check_out']}</p>
    <br>
    <p>A presto,<br>Desideri di Puglia</p>
    """
    return await asyncio.to_thread(_send_email_sync, booking["guest_email"], subject, html)

# ==================== ICAL CALENDAR LOGIC (SYNC) ====================

@api_router.get("/ical/sync")
async def sync_calendars():
    """IMPORT: Legge i calendari di Booking e blocca le date"""
    rooms = await db.rooms.find({"ical_import_url": {"$ne": ""}}).to_list(100)
    count = 0
    
    for room in rooms:
        url = room['ical_import_url']
        try:
            # Scarica il file .ics
            response = requests.get(url)
            c = Calendar(response.text)
            
            for event in c.events:
                start_date = event.begin.format("YYYY-MM-DD")
                end_date = event.end.format("YYYY-MM-DD")
                
                # Controlla se esiste già
                exists = await db.bookings.find_one({
                    "room_id": room['id'],
                    "check_in": start_date,
                    "source": "external_ical"
                })
                
                if not exists:
                    # Crea blocco
                    new_booking = Booking(
                        room_id=room['id'],
                        guest_email="noreply@booking.com",
                        guest_name="Imported Booking",
                        check_in=start_date,
                        check_out=end_date,
                        num_guests=1,
                        total_price=0,
                        status="confirmed",
                        source="external_ical"
                    )
                    await db.bookings.insert_one(new_booking.model_dump())
                    count += 1
        except Exception as e:
            logger.error(f"Errore sync stanza {room['id']}: {e}")
            
    return {"message": f"Sincronizzazione completata. {count} nuove date bloccate."}

@api_router.get("/ical/export/{room_id}")
async def export_calendar(room_id: str):
    """EXPORT: Genera il file .ics da dare a Booking"""
    room = await db.rooms.find_one({"id": room_id})
    if not room: raise HTTPException(404, "Room not found")
    
    # Crea calendario
    c = Calendar()
    bookings = await db.bookings.find({"room_id": room_id, "status": "confirmed"}).to_list(1000)
    
    for b in bookings:
        e = Event()
        e.name = "Occupato - Desideri di Puglia"
        e.begin = b['check_in']
        e.end = b['check_out']
        e.uid = b['id']
        c.events.add(e)
        
    # Ritorna il file come testo
    from fastapi.responses import Response
    return Response(content=str(c), media_type="text/calendar")

# ==================== ENDPOINTS BASE ====================

@api_router.get("/")
async def root():
    return {"message": "Desideri di Puglia API (Python)", "status": "online"}

@api_router.get("/rooms")
async def get_rooms():
    return await db.rooms.find({}, {"_id": 0}).to_list(100)

@api_router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room: raise HTTPException(404, "Room not found")
    return room

@api_router.put("/rooms/{room_id}")
async def update_room(room_id: str, update: RoomUpdate):
    data = {k: v for k, v in update.model_dump().items() if v is not None}
    await db.rooms.update_one({"id": room_id}, {"$set": data})
    return await db.rooms.find_one({"id": room_id}, {"_id": 0})

# --- BOOKINGS & STRIPE ---

@api_router.post("/bookings")
async def create_booking(data: BookingCreate):
    room = await db.rooms.find_one({"id": data.room_id})
    if not room: raise HTTPException(404, "Room not found")
    
    # Calcolo notti e prezzo
    d1 = datetime.strptime(data.check_in, "%Y-%m-%d")
    d2 = datetime.strptime(data.check_out, "%Y-%m-%d")
    nights = (d2 - d1).days
    total_price = nights * room['price_per_night']
    
    booking = Booking(
        room_id=data.room_id,
        guest_email=data.guest_email,
        guest_name=data.guest_name,
        check_in=data.check_in,
        check_out=data.check_out,
        num_guests=data.num_guests,
        total_price=total_price
    )
    
    # Sessione Stripe
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {'name': f"Prenotazione: {room['name_it']}"},
                    'unit_amount': int(total_price * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{data.origin_url.rstrip('/')}/booking/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{data.origin_url.rstrip('/')}/booking/cancel",
        )
        booking.stripe_session_id = session.id
        await db.bookings.insert_one(booking.model_dump())
        
        return {"checkout_url": session.url}
    except Exception as e:
        logger.error(f"Stripe Error: {e}")
        raise HTTPException(500, "Payment Error")

@api_router.get("/bookings/status/{session_id}")
async def check_booking_status(session_id: str):
    session = stripe.checkout.Session.retrieve(session_id)
    booking = await db.bookings.find_one({"stripe_session_id": session_id}, {"_id": 0})
    
    if session.payment_status == "paid" and booking['status'] != 'confirmed':
        # Aggiorna stato
        await db.bookings.update_one({"stripe_session_id": session_id}, {"$set": {"status": "confirmed"}})
        # Invia Email
        room = await db.rooms.find_one({"id": booking["room_id"]})
        await send_booking_confirmation_email(booking, room)
        
    return {"status": session.status}

# --- ANALYTICS (FIXED) ---

@api_router.get("/analytics/overview")
async def get_analytics_overview():
    # Calcola statistiche reali
    bookings = await db.bookings.find({"status": "confirmed"}).to_list(1000)
    
    total_revenue = sum(b['total_price'] for b in bookings)
    total_bookings = len(bookings)
    
    return {
        "summary": {
            "total_revenue": total_revenue,
            "total_bookings": total_bookings,
            "occupancy_rate": 0, # Da implementare logica complessa se serve
        }
    }

# --- AUTH ---
@api_router.post("/admin/login")
async def admin_login(data: AdminLogin):
    if data.username == ADMIN_USERNAME and hashlib.sha256(data.password.encode()).hexdigest() == ADMIN_PASSWORD_HASH:
        return {"success": True, "token": "fake-jwt-token-for-now"}
    raise HTTPException(401, "Invalid credentials")

# ==================== STARTUP ====================
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)