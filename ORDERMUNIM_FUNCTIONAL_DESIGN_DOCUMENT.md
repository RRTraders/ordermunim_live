# ORDERMUNIM NEXT-GEN: FUNCTIONAL DESIGN DOCUMENT (FDD)
================================================================================
Document: ORDERMUNIM_FUNCTIONAL_DESIGN_DOCUMENT.md
Target Platform: Flutter Native Android Engine (com.rrtraders.ordermunim) + Web Client
Scope: Complete Functional & Technical Architecture (Direct REST, Night Automation,
       Staff Security PIN, CCTV Webcam, Firestore Real-Time Cloud Sync)
Version: 1.0 (Production Master)
Date: 2026-10-18
================================================================================

## 1. Executive Summary

OrderMunim Next-Gen is an enterprise-grade mobile & cloud solution built specifically 
for high-volume marketplace sellers (Meesho, Amazon, Flipkart, Ajio). 

It unifies:
1. **Ultra-Fast Direct-REST Engine (Zero-WebView)**: 200ms login and 150ms return OTP fetching.
2. **Night-Time Auto-Download Scheduler**: Automated midnight alarms (12:00 AM) that accept hundreds of orders and download shipping labels in batches to bypass daytime Meesho server throttling.
3. **Staff Security 4-Digit PIN Lock**: Allows warehouse staff to handle phones without exposing confidential financial payouts or account credentials.
4. **CCTV Unboxing Webcam Recorder**: 1080p camera recording with burnt-in IST timestamp HUD to defeat 100% of wrong-return claims.
5. **Real-Time Firestore Cloud Bridge**: Android mobile app acts as an autonomous edge worker, pushing live OTPs to Firebase Firestore so the desktop web portal (`ordermunim.com`) and Warehouse Staff links update with 0ms latency.

---

## 2. High-Level System Architecture

```
+-----------------------------------------------------------------------------------------+
|                               ORDERMUNIM MOBILE ENGINE (FLUTTER)                        |
|                                                                                         |
|  +-------------------+  +--------------------+  +------------------+  +--------------+  |
|  | Multi-Store Mgr   |  | Night Auto-Schedule|  | Staff PIN Lock   |  | CCTV Camera  |  |
|  | (Direct REST V2)  |  | (12:00 AM Alarms)  |  | (4-Digit Shield) |  | (IST HUD)    |  |
|  +---------+---------+  +---------+----------+  +--------+---------+  +-------+------+  |
|            |                      |                      |                    |         |
|            v                      v                      v                    v         |
|  +-----------------------------------------------------------------------------------+  |
|  |                 NATIVE HTTP CLIENT (Dio + CookieJar + AlarmManager)               |  |
|  |                                                                                   |  |
|  |  * POST /api/container/user/v2-login           -> Instant 200ms Session           |  |
|  |  * GET  /api/container/supplier/getSupplierDetails -> Store Display Name          |  |
|  |  * POST /api/fulfillment/returnRto/fetchDeliveryOTPs -> Live Return OTPs (150ms)   |  |
|  |  * POST /api/fulfillment/orders/updatePendingOrderStatus -> Auto Accept at Night  |  |
|  |  * POST /api/fulfillment/orders/reqDownloadLabelV2 -> Batch PDF Generator         |  |
|  +-----------------------------------------+-----------------------------------------+  |
+--------------------------------------------|--------------------------------------------+
                                             |
                         HTTPS REST Write    | (Under 50ms)
                                             v
+-----------------------------------------------------------------------------------------+
|                                 FIREBASE CLOUD FIRESTORE                                |
|                                                                                         |
|   Collections:                                                                          |
|   - /accounts/{accountId}        -> Live OTPs, Courier Partner, Packet Count, Status    |
|   - /labels_queue/{batchId}      -> Generated Night-Batch Label URLs for Desktop Print  |
|   - /config/app_update           -> Force-Update In-App Broadcast System                 |
+--------------------------------------------+--------------------------------------------+
                                             |
                         WebSocket onSnapshot| (Real-Time 0ms Delay)
                                             v
+-----------------------------------------------------------------------------------------+
|                         ORDERMUNIM WEB PORTAL (ordermunim.com)                          |
|                                                                                         |
|  * Real-Time Desktop Return OTP Screen (Live Audio Buzzer & Instant Copy)               |
|  * 1-Click Warehouse Staff View Link (No Login Required)                                |
|  * 4x6 Thermal Label Cropper with Auto Courier Sorting (Delhivery, Shadowfax, Valmo)    |
|  * Amazon Invoice Remover & SKU Qty / Size Thermal Label Generator                      |
|  * Ajio Customer-Matched PDF Merger & QR Code Follow-Up Suite                           |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Core Functional Modules

### Module 1: Direct-REST Authentication & Multi-Store Manager
* **Zero-WebView Operation**: Operates strictly via raw HTTPS requests through Dart's `dio` connection pool with `cookie_jar`.
* **Login Speed**: ~200 milliseconds.
* **Auto-Discovery**: Extracts authentic commercial display name (e.g. `"Kaanchan Export 1"`) via `getSupplierDetails` immediately after login.
* **Multi-Store Isolation**: Separate persistent cookie jars per store account in Android `SharedPreferences`.

### Module 2: Night-Time Order Acceptance & Label Batch Downloader
* **The Problem It Solves**: Big sellers with 500–2,000 orders/day face severe daytime Meesho server throttling, resulting in *"Label download failed? Meesho will retry automatically"*.
* **The Solution**: 
  1. The seller configures a **Daily Alarm** (default: `12:00 AM` or `02:00 AM IST`).
  2. While the merchant is asleep, the phone wakes up via Android OS `AlarmManager` (`setExactAndAllowWhileIdle`).
  3. Executes `reqPendingOrders` $\rightarrow$ Transitions all orders to `Ready to Ship`.
  4. Executes `reqDownloadLabelV2` $\rightarrow$ Triggers batch PDF compilation on Meesho's quiet midnight servers.
  5. Pulls completed PDFs via `fetchLabelDownloadHistory` (`DOWNLOAD NOT DOWNLOADED LABEL`).
  6. Automatically uploads metadata and links to Firestore `/labels_queue/`.
  7. When staff arrives at 8:00 AM, all labels are ready on the desktop web app for 1-click thermal printing.

### Module 3: Return Delivery OTP Streamer & Free SIM Protection
* **The Problem It Solves**: Sellers spend ₹300–₹400/month per SIM card on mobile recharges just to keep delivery OTP numbers active.
* **The Solution**: Pulls Return Delivery OTPs directly from the Meesho seller API in 150ms.
* **Displays**:
  - Live 6-digit OTP
  - Courier Partner Name (Valmo, Delhivery, Shadowfax, Xpressbees)
  - Courier Delivery Boy Mobile Number
  - Packet Handover Count
* **Local Alerting**: High-priority Android notification channel with loud siren buzzer and persistent vibration.
* **Cloud Sync**: Immediately pushes payload to Firestore so warehouse packing stations see the OTP on PC screens with zero lag.

### Module 4: Staff Protection 4-Digit Security PIN Shield
* Designed for warehouse phones used by packagers and helpers:
* Admin configures a master **4-digit PIN**.
* **Lockable Sections**:
  * 🔒 **Lock Payments**: Completely hides bank settlements, 7-day payout totals, and product pricing.
  * 🔒 **Lock Dashboard**: Hides aggregate business revenue and total order numbers.
  * 🔒 **Lock Accounts**: Prevents staff from adding, editing, or deleting Meesho stores.
  * 🔒 **Lock Schedule**: Prevents altering night automation alarms.
* When locked, tapping the protected tab displays a secure PIN pad modal requiring the admin code.

### Module 5: CCTV Unboxing Webcam Proof Engine
* Hardware-accelerated camera module for recording customer returns.
* **Burnt-in IST Timestamp HUD**: Burns live date, time (IST down to milliseconds: `DD-MM-YYYY HH:mm:ss.SSS`), Store Name, and AWB Tracking Number onto every video frame.
* Generates tamper-proof video proof to win 100% of marketplace return fraud claims.

---

## 4. Full Meesho API Catalog (Direct-REST Protocol)

| Category | Method | Endpoint URL | Purpose |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `https://supplier.meesho.com/api/container/user/v2-login` | Instant 200ms login & session cookie extraction |
| **Profile**| `GET` | `https://supplier.meesho.com/api/container/supplier/getSupplierDetails` | Commercial store display name & supplier ID |
| **Status** | `GET` | `https://supplier.meesho.com/api/container/supplier/fetch-registration-status` | Registration validation & account standing |
| **OTPs** | `POST` | `https://supplier.meesho.com/api/fulfillment/returnRto/fetchDeliveryOTPs` | 150ms live return delivery OTPs & packet counts |
| **Returns**| `POST` | `https://supplier.meesho.com/fulfillmentapi/api/returnRto/fetchOverviewV2` | Total pending returns & in-transit RTO overview |
| **Orders** | `GET` | `https://supplier.meesho.com/api/fulfillment/orders` | Active pending, ready-to-ship, and cancelled queue |
| **Orders** | `POST` | `https://supplier.meesho.com/api/fulfillment/orders/reqPendingOrders` | Triggers backend order compilation for new orders |
| **Orders** | `GET` | `https://supplier.meesho.com/api/fulfillment/orders/fetchPendingOrdersHistory` | Historical fulfillment list |
| **Orders** | `POST` | `https://supplier.meesho.com/api/fulfillment/orders/updatePendingOrderStatus` | Accepts pending orders -> moves to Ready-to-Ship |
| **Labels** | `POST` | `https://supplier.meesho.com/api/fulfillment/orders/reqDownloadLabelV2` | Generates official Meesho shipping label PDFs |
| **Labels** | `GET` | `https://supplier.meesho.com/api/fulfillment/orders/fetchLabelDownloadHistory` | Pulls generated label download URLs |
| **Labels** | `POST` | `https://supplier.meesho.com/api/fulfillment/orders/updateLabelDownloadStatus` | Marks labels as printed to avoid duplicates |
| **Labels** | `POST` | `https://supplier.meesho.com/api/fulfillment/orders/updateGroupDownloadBackendFlag`| Enables batch PDF generation flag on Meesho |
| **Payouts**| `GET` | `https://supplier.meesho.com/api/payouts/payments/all-ui-data` | Next 7 days payouts, past deductions, balances |
| **Payouts**| `GET` | `https://supplier.meesho.com/api/payouts/payments/upcoming-total-amount` | Net upcoming credit amount |

---

## 5. Screen & Navigation Flow (6 Tabs)

```
+----------------------------------------------------------------------------------------------------------------+
|                                              BOTTOM NAVIGATION BAR                                             |
+---------------------+-------------------+---------------------+--------------------+---------------------------+
| 1. [Dashboard]      | 2. [Payments (₹)] | 3. [OTPs (Key)]     | 4. [Schedule]      | 5. [Stores & CCTV]        |
| Total On Hold,      | Next 7 Days total | Live OTP cards,     | Daily midnight     | Multi-store setup,        |
| Pending orders,     | payout, per-store | Courier boy mobile, | order accept alarm,| 1-tap unboxing CCTV rec,  |
| Ready-to-Ship stats | breakdown (LOCKED)| Packet count, siren | Label batch queue  | 4-digit Admin PIN settings|
+---------------------+-------------------+---------------------+--------------------+---------------------------+
```

---

## 6. Firestore Real-Time Schema

### Document: `/accounts/{accountId}`
```json
{
  "storeName": "Kaanchan Export 1",
  "supplierId": 2646036,
  "email": "akshayenterprise@gmail.com",
  "currentOtp": "581920",
  "courier": "Shadowfax",
  "deliveryBoyPhone": "9898092008",
  "packetCount": 4,
  "status": "live",
  "lastSyncedAt": "2026-10-18T12:00:00Z",
  "updatedAt": "ServerTimestamp()"
}
```

### Document: `/labels_queue/{batchId}`
```json
{
  "storeName": "Kaanchan Export 1",
  "downloadUrl": "https://supplier-fulfillment.meesho.com/labels/batch_102.pdf",
  "orderCount": 450,
  "generatedAt": "2026-10-18T00:05:00Z",
  "status": "ready_to_print"
}
```

---

## 7. Verification & Implementation Roadmap

1. **Flutter Scaffolding**: Setup Flutter 3.24 project with packages `dio`, `cookie_jar`, `cloud_firestore`, `camera`, `android_alarm_manager_plus`, `flutter_local_notifications`.
2. **REST API Service Implementation**: Port the 15 Meesho endpoints with automatic re-login on 401.
3. **Background Alarm Worker**: Implement the midnight 12:00 AM order acceptance & label batch runner.
4. **Staff PIN Security Shield**: Add local storage PIN authentication for Payments and Accounts tabs.
5. **CCTV Webcam Canvas**: Implement CameraX with real-time burnt-in IST timestamp HUD.
6. **Deploy & Web Synergy**: Connect the generated APK outputs to `ordermunim.com` live thermal tools.
