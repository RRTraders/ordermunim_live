# Meesho Return OTP Hub (Multi-Account SaaS)

Automated system to extract Meesho Return Handover OTPs (Valmo, Shadowfax, Delhivery, etc.) and stream them in real time to a Mobile Web App for sellers and warehouse staff.

---

## 🌐 Production URLs (Live Worldwide)

- **Official Live Web App (Customer & Admin Portal):**
  👉 **[https://meesho-otp-live.web.app](https://meesho-otp-live.web.app)**
  *(Also available at: https://meesho-otp-live.firebaseapp.com)*

- **Warehouse Staff View Link Format (No login required for warehouse staff):**
  👉 `https://meesho-otp-live.web.app/?staff=<CUSTOMER_USER_ID>`
  *(Each customer and admin can copy this directly from the dashboard or admin panel).*

---

## 👑 Super Admin Credentials

- **Email:** `rrtradersofficials@gmail.com`
- **Password:** `@rrt123`
- **Admin Secret Code:** `admin249`

### Admin Capabilities:
- Full view of registered clients and total active stores.
- Toggle **On Hold / Active** status (blurs store cards instantly when On Hold).
- Send **Payment Alert** notices.
- Increment/Decrement store slot quotas.
- Delete client accounts and unlink duplicate stores.
- One-click copy for customer Warehouse Staff links.

---

## 🚀 How to Start Background Automation & Scraper

Double-click **`start_meesho_hub.bat`** in this project folder.
It automatically launches:
1. Cloudflare Secure HTTPS Tunnel
2. Node.js Playwright Background Scraper (`server.js`)

OTPs are synchronized every 5 minutes during courier hours (10:00 AM - 06:00 PM IST) and every 60 minutes during off-hours directly from Meesho Seller Portal and pushed to Firestore in real time!
