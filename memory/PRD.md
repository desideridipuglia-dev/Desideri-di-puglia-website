# Desideri di Puglia - B&B Booking Website

## Original Problem Statement
Creare un sito di prenotazioni per il B&B "Desideri di Puglia" situato a Barletta in Via Borgo Vecchio 65. Due monolocali: "Stanza della Nonna" e "Stanza del Pozzo" (max 3 persone, €80/notte). Sistema prenotazioni con Stripe e calendario, galleria fotografica, recensioni, switch lingua IT/EN, stile boutique di lusso.

## User Personas
1. **Turisti Internazionali** - Cercano esperienza autentica pugliese, necessitano sito bilingue
2. **Coppie/Famiglie** - Prenotano soggiorni brevi, apprezzano il lusso accessibile
3. **Proprietario** - Gestisce prezzi, disponibilità e prenotazioni tramite admin panel

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion + shadcn/ui
- **Backend**: FastAPI + MongoDB + emergentintegrations (Stripe)
- **Database**: MongoDB (collections: rooms, bookings, reviews, payment_transactions, contact_messages, settings)

## Core Requirements (Static)
- [x] 2 stanze con prezzi modificabili
- [x] Sistema prenotazione con calendario disponibilità
- [x] Pagamento Stripe
- [x] Galleria fotografica per stanze
- [x] Sistema recensioni
- [x] Multilingua IT/EN
- [x] Design luxury boutique

## What's Been Implemented (2025-01-20)
- Homepage con hero full-screen, logo, animazioni luxury
- Pagina stanze con card e prezzi
- Dettaglio stanza con galleria e navigazione immagini
- Sistema prenotazione completo (calendario, form, Stripe checkout)
- Pagine success/cancel per booking flow
- Pagina servizi con tutti gli amenities
- Pagina recensioni con demo reviews
- Pagina contatti con form funzionante
- Admin panel per gestione prezzi e prenotazioni
- Switch lingua IT/EN funzionante
- Footer con informazioni complete

## Prioritized Backlog
### P0 (Completed)
- Booking flow con Stripe ✅
- Admin gestione prezzi ✅
- Multilingua ✅

### P1 (Future)
- Email di conferma prenotazione automatica
- Sistema notifiche per nuove prenotazioni
- Integrazione Google Calendar per sincronizzazione

### P2 (Nice to have)
- Reviews con verifica booking completato
- Sistema voucher/coupon
- Dashboard analytics per proprietario

## Next Tasks
1. Aggiungere foto reali delle stanze
2. Configurare email transazionali (conferma prenotazione)
3. Aggiungere numero telefono reale nei contatti
4. Passare da Stripe test a produzione
