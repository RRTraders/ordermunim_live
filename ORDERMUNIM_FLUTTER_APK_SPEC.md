# ORDERMUNIM FLUTTER NATIVE APK ARCHITECTURE & SPECIFICATION
================================================================================
Document: ORDERMUNIM_FLUTTER_APK_SPEC.md
Project: OrderMunim Native Android App (Flutter Engine)
Target: Direct REST API (Zero-WebView) + CCTV Webcam + Firestore Cloud Sync
Status: PRODUCTION SPECIFICATION
================================================================================

## 1. Executive Summary & Objective

The OrderMunim Native Flutter App replaces the legacy WebView/browser-automation
engine with a **Pure Direct-REST Native Engine** modeled after the reverse-engineered
`ECO SKU` architecture, enhanced with OrderMunim's proprietary **CCTV Unboxing 
Webcam** and **Real-Time Firestore Cloud Sync** for the desktop web dashboard.

### Core Value Proposition:
1. **Instant 200ms Login & Relogin**: Zero WebView overhead, zero DOM loading, zero scripts download.
2. **Instant Delivery OTP Streaming**: Fetched via direct HTTP POST in < 150ms.
3. **Firestore Cloud Bridge**: Every OTP fetched on the phone is instantly synced to Firebase Firestore so `ordermunim.com` and Warehouse Staff links display it with 0ms latency.
4. **CCTV Unboxing Video Recorder**: High-definition camera recording with live burnt-in IST timestamp HUD to defeat wrong-return claims.
5. **Background Battery & Doze Resilience**: Native Android `AlarmManager` + Foreground Service (`FOREGROUND_SERVICE_DATA_SYNC`).

---

## 2. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                        ORDERMUNIM NATIVE FLUTTER APP                              |
|                                                                                   |
|  +-------------------------+  +--------------------------+  +------------------+  |
|  |     Multi-Store UI      |  |   CCTV Webcam Recorder   |  |  Local Alerts    |  |
|  | (Add Store, Live Cards) |  | (CameraX + IST Stamp HUD)|  | (Buzzer & Sound) |  |
|  +------------+------------+  +--------------------------+  +--------+---------+  |
|               |                                                      ^            |
|               v                                                      |            |
|  +-------------------------------------------------------------------+---------+  |
|  |               NATIVE DIRECT-REST ENGINE (Dio + CookieJar)                   |  |
|  |                                                                             |  |
|  |  * POST /api/container/user/v2-login          -> Authenticates in 200ms     |  |
|  |  * GET  /api/container/supplier/getSupplierDetails -> Store Display Name   |  |
|  |  * POST /api/fulfillment/returnRto/fetchDeliveryOTPs -> Live OTPs (150ms)   |  |
|  |  * Persistent Session Storage (Encrypted SharedPreferences)                 |  |
|  +------------------------------------+----------------------------------------+  |
+---------------------------------------|-------------------------------------------+
                                        |
                 HTTPS REST Write       | (Under 50ms)
                                        v
+-----------------------------------------------------------------------------------+
|                            FIREBASE FIRESTORE CLOUD                               |
|                                                                                   |
|   Document: /accounts/{accountId}                                                 |
|   Data: {                                                                         |
|     currentOtp: "849201",                                                         |
|     courier: "Shadowfax",                                                         |
|     packets: 4,                                                                   |
|     storeName: "Kaanchan Export 1",                                               |
|     updatedAt: ServerTimestamp()                                                  |
|   }                                                                               |
+---------------------------------------+-------------------------------------------+
                                        |
                 Firestore onSnapshot   | (Real-Time WebSocket Stream)
                                        v
+-----------------------------------------------------------------------------------+
|                      ORDERMUNIM WEB PORTAL (ordermunim.com)                       |
|                                                                                   |
|  * Live Return OTP Dashboard (Desktop / Packing Station)                          |
|  * Warehouse Staff 1-Click Link                                                   |
|  * Thermal Shipping Label Cropper & Courier Sorter (Delhivery, Shadowfax, Ekart)  |
|  * Amazon Invoice Remover & SKU Printer                                           |
|  * Ajio Customer-Matched PDF Merger                                               |
|  * QR Code Branding Suite                                                         |
+-----------------------------------------------------------------------------------+
```

---

## 3. Technology Stack & Dependencies

| Component | Package / Tool | Purpose |
| :--- | :--- | :--- |
| **Framework** | Flutter 3.24+ (Dart 3.5+) | High-performance compiled native AOT binary |
| **HTTP Client** | `dio: ^5.7.0` | Ultra-fast connection pooling, interceptors, timeouts |
| **Cookie Manager**| `cookie_jar: ^4.0.8`<br>`dio_cookie_manager: ^3.1.1` | Persists session cookies across reboots and network switches |
| **Cloud Sync** | `cloud_firestore: ^5.4.4`<br>`firebase_core: ^3.6.0` | Real-time write stream to Firebase for Web & Staff access |
| **CCTV Camera** | `camera: ^0.11.0+2` | High-fps hardware recording for return package unboxing |
| **Background Sync**| `android_alarm_manager_plus: ^4.0.4`<br>`flutter_background: ^1.3.1` | Exact IST interval alarms (5 min courier / 60 min off-hours) |
| **Alerts & Buzzer**| `flutter_local_notifications: ^17.2.3`<br>`audioplayers: ^6.0.0` | Urgent return buzzer audio and heads-up notification |
| **Local Storage** | `flutter_secure_storage: ^9.2.2` | Hardware-backed AES-256 encryption for credentials |

---

## 4. API Specification & Meesho Protocol

### 4.1 Authentication Endpoint (Login & Relogin)
* **Method**: `POST`
* **URL**: `https://supplier.meesho.com/api/container/user/v2-login`
* **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json, text/plain, */*
  User-Agent: Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36
  ```
* **Payload**:
  ```json
  {
    "identifier": "merchant_phone_or_email",
    "password": "merchant_password"
  }
  ```
* **Response Handling**:
  - Extracts HTTP Set-Cookie headers (`meesho_supplier_auth`, `session_token`, etc.).
  - Extracts `supplier_identifiers` and `supplier_identifier_to_id_mapping`.
  - Latency: **~200ms**.

### 4.2 Supplier & Store Display Name Endpoint
* **Method**: `GET`
* **URL**: `https://supplier.meesho.com/api/container/supplier/getSupplierDetails`
* **Headers**: Authenticated via `CookieJar`.
* **Data Extracted**:
  - Commercial Display Brand Name (e.g. `"Kaanchan Export 1"`).
  - Supplier ID & Registration Status.

### 4.3 Live Return Delivery OTP Endpoint
* **Method**: `POST`
* **URL**: `https://supplier.meesho.com/api/fulfillment/returnRto/fetchDeliveryOTPs`
* **Headers**: Authenticated via `CookieJar`.
* **Payload**: `{}`
* **Response JSON Schema**:
  ```json
  {
    "success": true,
    "data": [
      {
        "delivery_otp": "491823",
        "courier_partner": "Shadowfax",
        "packet_count": 3,
        "created_at": "2026-10-18T11:00:00Z"
      }
    ]
  }
  ```
* **Latency**: **~150ms**.

### 4.4 Live Return & RTO Overview Endpoint
* **Method**: `POST`
* **URL**: `https://supplier.meesho.com/fulfillmentapi/api/returnRto/fetchOverviewV2`
* **Headers**: Authenticated via `CookieJar`.
* **Payload**: `{}`
* **Data Extracted**:
  - Total pending return packets count
  - Intransit return packets by courier partner
  - Completed vs disputed RTO packages

### 4.5 Orders & Shipping Label Processing (Complete Suite)
This matches the full shipping operations extracted from the competitor architecture:

#### A. Order Listing & Pending Queue
* **List Active Orders**:
  - `GET https://supplier.meesho.com/api/fulfillment/orders`
  - Fetches active pending, ready-to-ship, and cancelled orders.
* **Request Pending Orders**:
  - `POST https://supplier.meesho.com/api/fulfillment/orders/reqPendingOrders`
  - Triggers backend order compilation for newly placed orders.
* **Pending Orders History**:
  - `GET https://supplier.meesho.com/api/fulfillment/orders/fetchPendingOrdersHistory`
  - Retrieves paginated list of historically fulfilled or pending orders.
* **Update Pending Order Status**:
  - `POST https://supplier.meesho.com/api/fulfillment/orders/updatePendingOrderStatus`
  - Transitions orders to 'Ready to Ship' or 'Hold'.

#### B. Shipping Label Generation & Download
* **Generate & Download Shipping Labels**:
  - `POST https://supplier.meesho.com/api/fulfillment/orders/reqDownloadLabelV2`
  - Generates official Meesho shipping label PDFs with barcode/AWB.
* **Label Download History**:
  - `GET https://supplier.meesho.com/api/fulfillment/orders/fetchLabelDownloadHistory`
  - Fetches previously generated label download URLs and timestamps.
* **Update Label Download Status**:
  - `POST https://supplier.meesho.com/api/fulfillment/orders/updateLabelDownloadStatus`
  - Marks labels as downloaded/printed to prevent duplicate printing.
* **Batch / Group Download Backend Flag**:
  - `POST https://supplier.meesho.com/api/fulfillment/orders/updateGroupDownloadBackendFlag`
  - Toggles batch PDF generation mode on Meesho backend.

### 4.6 Payouts & Payment Dashboard
* **All Payouts & Payment UI Data**:
  - `GET https://supplier.meesho.com/api/payouts/payments/all-ui-data`
  - Fetches settlement balances, previous payouts, and deducted returns.
* **Upcoming Total Amount**:
  - `GET https://supplier.meesho.com/api/payouts/payments/upcoming-total-amount`
  - Returns upcoming payout date and net credit amount.

---

## 5. Cloud Sync Pipeline (App -> Firestore -> Website)

When a new delivery OTP is fetched by the native app, the sync pipeline executes:

```dart
Future<void> syncOtpToFirestore({
  required String accountId,
  required String storeName,
  required String otp,
  required String courier,
  required int packets,
}) async {
  final docRef = FirebaseFirestore.instance.collection('accounts').doc(accountId);
  
  await docRef.update({
    'currentOtp': otp,
    'courier': courier,
    'packetCount': packets,
    'status': 'live',
    'lastSyncedAt': FieldValue.serverTimestamp(),
    'source': 'flutter_native_direct_rest',
  });
}
```

### Result on Web Portal (`ordermunim.com`):
The web dashboard listens via `onSnapshot(doc(db, 'accounts', accountId))`.
The second the phone fetches an OTP via the REST API, the browser updates on screen
without needing a page refresh.

---

## 6. CCTV Unboxing Webcam Proof Specification

To protect sellers against fraudulent, damaged, or wrong-return claims:
1. **Camera Engine**:
   - Hardware-accelerated 1080p / 720p 30fps recording using `camera: ^0.11.0`.
2. **Burnt-In Real-Time HUD (Heads-Up Display)**:
   - Every recorded frame is stamped with:
     * **Date & Time (IST)**: `DD-MM-YYYY HH:mm:ss.SSS`
     * **Store Name**: e.g., `Kaanchan Export 1`
     * **AWB Tracking Number / Order ID**
     * **Courier Partner**: e.g., `Delhivery / Shadowfax / Valmo`
3. **Local Storage & Export**:
   - Stored directly in `DCIM/OrderMunim_Proof/` as compressed `.mp4`.
   - 1-tap WhatsApp or Cloud share to dispute marketplace return claims.

---

## 7. Background Polling & Doze Mode Management

### Schedule Rules (Per Indian Standard Time):
* **Courier Operating Hours (10:00 AM – 06:00 PM IST)**:
  - Polling Interval: **Every 5 Minutes**.
* **Off-Hours (06:00 PM – 10:00 AM IST)**:
  - Polling Interval: **Every 60 Minutes**.

### OS Implementation:
* Registered via `AndroidAlarmManager.periodic` with `exact: true` and `wakeup: true`.
* Bound to Android `FOREGROUND_SERVICE_DATA_SYNC` with notification channel:
  - Channel ID: `ordermunim_otp_sync_channel`
  - Priority: `IMPORTANCE_LOW` (Silent persistent background badge).
* When an OTP arrives:
  - Triggers Channel `ordermunim_otp_alert_channel` with `IMPORTANCE_HIGH`, loud siren chime, and vibration.

---

## 8. Screen Flow & Navigation Architecture

```
+---------------------------------------------------------------------------------------+
|                                 BOTTOM NAVIGATION BAR                                 |
+-------------------+--------------------+------------------------+---------------------+
| 1. [OTPs]         | 2. [Orders & Labels| 3. [CCTV Camera]       | 4. [Stores & Payout]|
| Live OTP Cards,   | Pending orders,    | 1-Tap Unboxing Rec,    | Multi-store setup,  |
| Packet Counters,  | Label download,    | Burnt-in IST Stamp HUD,| Payouts balance,    |
| Buzzer Audio Mute | Status transitions | Gallery of Proofs      | Battery settings    |
+-------------------+--------------------+------------------------+---------------------+
```

---

## 9. Next Steps for Implementation

1. **Flutter Project Initialization**:
   Create `ordermunim_flutter/` with Android SDK 24+ and package `com.rrtraders.ordermunim`.
2. **Implement `MeeshoApiService`**:
   Write Dio REST service with `v2-login`, `getSupplierDetails`, and `fetchDeliveryOTPs`.
3. **Implement `FirestoreSyncService`**:
   Bind incoming API OTP responses directly to `/accounts/{id}`.
4. **Implement `CctvRecorderScreen`**:
   Add CameraX viewfinder with real-time canvas timestamp overlay.
5. **Compile & Distribute**:
   Output `ordermunim_v7.0.apk` with the new zero-WebView engine.
