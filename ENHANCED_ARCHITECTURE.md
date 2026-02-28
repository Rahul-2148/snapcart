# 🏗️ ENHANCED SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SNAPCART ENHANCED DELIVERY SYSTEM                     │
│                               (Blinkit Clone v2.0)                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER (Next.js 14)                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │  Customer Portal │    │ Delivery Partner │    │ Admin Dashboard  │      │
│  ├──────────────────┤    ├──────────────────┤    ├──────────────────┤      │
│  │ • Order Tracking │    │ • Assignments    │    │ • Payouts        │      │
│  │ • 🗺️ Live Map   │    │ • OTP Generation │    │ • Analytics      │      │
│  │ • Rating System  │    │ • Photo Upload   │    │ • Partner Mgmt   │      │
│  │ • 🔔 Push Notifs │    │ • GPS Tracking   │    │ • 🗺️ Live Map   │      │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         REAL-TIME COMMUNICATION LAYER                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────┐              ┌─────────────────────────┐       │
│  │   Socket.io Server      │              │  Firebase Cloud         │       │
│  │   (Port 3001)           │              │  Messaging (FCM)        │       │
│  ├─────────────────────────┤              ├─────────────────────────┤       │
│  │ • Location Updates      │              │ • Background Push       │       │
│  │ • Status Changes        │              │ • Rich Notifications    │       │
│  │ • Earnings Credits      │              │ • Cross-platform        │       │
│  │ • Rating Notifications  │              │ • Topic Subscriptions   │       │
│  └─────────────────────────┘              └─────────────────────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Next.js App Router)                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Delivery APIs   │  │  OTP APIs       │  │  Notification   │             │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤             │
│  │ • Assignments   │  │ • 📧 Email      │  │ • FCM Token Reg │             │
│  │ • Status Update │  │ • 📱 SMS        │  │ • Push Send     │             │
│  │ • Location      │  │ • Generate      │  │ • Topic Sub     │             │
│  │ • Cancel        │  │ • Verify        │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Photo APIs     │  │  Rating APIs    │  │  Payout APIs    │             │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤             │
│  │ • Upload        │  │ • Submit Rating │  │ • Generate      │             │
│  │ • Validation    │  │ • Get Reviews   │  │ • Release       │             │
│  │                 │  │ • Counter-Rate  │  │ • Complete      │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         BUSINESS LOGIC LAYER                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  Delivery Assignment Engine                                     │        │
│  ├─────────────────────────────────────────────────────────────────┤        │
│  │  • 📍 Distance-based matching (7km radius)                      │        │
│  │  • ⭐ Rating-based priority (4.5+ stars first)                  │        │
│  │  • 📊 Acceptance rate weighting                                 │        │
│  │  • 🔄 Auto re-broadcast (every 6 min, max 3 times)              │        │
│  │  • 🚫 Penalty system (₹50/cancel, 3-strike ban)                 │        │
│  │  • 💰 Surge pricing (1.5x peak, 1.2x weekends, cap 2.5x)        │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES LAYER                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Nodemailer  │  │   Twilio     │  │  Cloudinary  │  │  Razorpay    │    │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤    │
│  │ 📧 Email OTP │  │ 📱 SMS OTP   │  │ 📷 Photo CDN │  │ 💳 Payouts   │    │
│  │ • Templates  │  │ • 500 free   │  │ • Storage    │  │ • Bank       │    │
│  │ • SMTP       │  │ • Delivery   │  │ • Transform  │  │   Transfer   │    │
│  │              │  │   Status     │  │ • Compress   │  │ • Webhooks   │    │
│  │ ✅ Active   │  │ ⚙️ Optional  │  │ ✅ Active   │  │ ✅ Active   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Firebase   │  │   Leaflet    │  │  Socket.io   │  │   MongoDB    │    │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤    │
│  │ 🔔 FCM Push  │  │ 🗺️ Maps     │  │ ⚡ Real-time │  │ 💾 Database  │    │
│  │ • Background │  │ • Markers    │  │ • WebSocket  │  │ • Mongoose   │    │
│  │ • Topics     │  │ • Routes     │  │ • Events     │  │ • Schemas    │    │
│  │              │  │ • Tiles      │  │              │  │              │    │
│  │ ⚙️ Optional  │  │ ✅ Active   │  │ ✅ Active   │  │ ✅ Active   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CRON JOBS & BACKGROUND TASKS                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  ⏰ check-assignment-expiry (Every 1 minute)                     │        │
│  │  • Checks orders without acceptance for 6+ minutes               │        │
│  │  • Expands broadcast radius (7km → 10km → 15km)                 │        │
│  │  • Re-broadcasts to new partners                                 │        │
│  │  • Auto-cancels after 3 failed attempts                          │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  💰 generate-weekly-payouts (Every Monday 00:00 UTC)             │        │
│  │  • Scans all delivery partners with pending earnings             │        │
│  │  • Validates bank account details                                │        │
│  │  • Deducts cancellation penalties                                │        │
│  │  • Creates payout records for admin approval                     │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

                        📊 DATA FLOW: COMPLETE DELIVERY
                        
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  1️⃣ CUSTOMER PLACES ORDER                                                │
│     ↓ Order saved to MongoDB                                             │
│     ↓ Payment processed (Razorpay/Stripe/COD)                            │
│     ↓ Delivery assignment created                                         │
│                                                                            │
│  2️⃣ SYSTEM BROADCASTS ORDER                                              │
│     ↓ Find partners within 7km radius                                     │
│     ↓ Sort by: Rating (40%) + Acceptance (30%) + Distance (30%)          │
│     ↓ Send Socket.io event to top 10 partners                            │
│     ↓ 🔔 Push notification: "New Delivery Request"                       │
│                                                                            │
│  3️⃣ PARTNER ACCEPTS ORDER                                                │
│     ↓ Assignment locked to partner                                        │
│     ↓ GPS tracking activated                                              │
│     ↓ Socket.io: "delivery_accepted"                                      │
│     ↓ 🔔 Push to customer: "Partner Assigned"                            │
│                                                                            │
│  4️⃣ PARTNER PICKS UP ORDER                                               │
│     ↓ Status: picked_up                                                   │
│     ↓ Calculate surge: Peak? Weekend?                                     │
│     ↓ Apply multiplier: 1.5x-2.5x                                         │
│     ↓ Socket.io: "delivery_picked_up"                                     │
│     ↓ 🔔 Push: "Order Picked Up"                                          │
│                                                                            │
│  5️⃣ CUSTOMER TRACKS DELIVERY                                             │
│     ↓ Opens /order/tracking?orderId=xxx                                   │
│     ↓ 🗺️ Sees Leaflet map with:                                          │
│     │   • 📍 Blue marker = Delivery address                              │
│     │   • 🚴 Green marker = Partner location                             │
│     │   • Dotted route line                                              │
│     ↓ Map updates every 10s via Socket.io                                │
│                                                                            │
│  6️⃣ PARTNER ARRIVES                                                      │
│     ↓ Status: arrived                                                     │
│     ↓ Partner clicks "Generate OTP"                                       │
│     ↓ System generates 4-digit OTP                                        │
│     ↓ 📧 Email sent (Nodemailer)                                          │
│     ↓ 📱 SMS sent (Twilio) [if configured]                               │
│     ↓ 🔔 Push: "Partner Arrived - Share OTP"                             │
│                                                                            │
│  7️⃣ DELIVERY COMPLETED                                                   │
│     ↓ Partner enters customer's OTP                                       │
│     ↓ System verifies OTP                                                 │
│     ↓ 📷 Partner uploads delivery photo (Cloudinary)                      │
│     ↓ Status: delivered                                                   │
│     ↓ 💰 Earnings credited (with surge)                                   │
│     ↓ Socket.io: "delivery_completed"                                     │
│     ↓ 🔔 Push to customer: "Order Delivered"                             │
│     ↓ 🔔 Push to partner: "₹75 credited"                                 │
│                                                                            │
│  8️⃣ CUSTOMER RATES DELIVERY                                              │
│     ↓ Rates 1-5 stars + optional review                                   │
│     ↓ Partner's avg rating updated                                        │
│     ↓ Socket.io: "order_rated"                                            │
│     ↓ 🔔 Push to partner: "You got 5 stars!"                             │
│                                                                            │
│  9️⃣ WEEKLY PAYOUT                                                        │
│     ↓ Cron runs every Monday 00:00 UTC                                    │
│     ↓ Calculates: Earnings - Penalties                                    │
│     ↓ Creates payout record                                               │
│     ↓ Admin approves in dashboard                                         │
│     ↓ 💳 Razorpay transfers to bank                                       │
│     ↓ 🔔 Push: "Payout Completed: ₹500"                                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

                        🔥 ENHANCED FEATURES BREAKDOWN

┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  🗺️ VISUAL MAP TRACKING                                                   │
│  ├─ Technology: Leaflet.js + react-leaflet                               │
│  ├─ Updates: Socket.io (every 10 seconds)                                │
│  ├─ Features:                                                             │
│  │  • Dual markers (customer + partner)                                  │
│  │  • Route line with animation                                          │
│  │  • Auto-fit bounds                                                    │
│  │  • ETA & distance display                                             │
│  │  • Smooth transitions                                                 │
│  └─ Files: TrackingMap.tsx, tracking/page.tsx                            │
│                                                                            │
│  📱 SMS OTP VIA TWILIO                                                    │
│  ├─ Technology: Twilio SMS API                                           │
│  ├─ Fallback: Email always sent                                          │
│  ├─ Features:                                                             │
│  │  • Dual-channel delivery                                              │
│  │  • Professional templates                                             │
│  │  • Delivery tracking                                                  │
│  │  • Free tier: 500 SMS/month                                           │
│  └─ Files: api/delivery-boy/otp/route.ts                                 │
│                                                                            │
│  🔔 PUSH NOTIFICATIONS (FCM)                                              │
│  ├─ Technology: Firebase Cloud Messaging                                 │
│  ├─ Platforms: Android, iOS, Web                                         │
│  ├─ Features:                                                             │
│  │  • Background notifications                                           │
│  │  • Rich notifications with actions                                    │
│  │  • Topic subscriptions                                                │
│  │  • Unlimited free tier                                                │
│  └─ Files:                                                                │
│     • firebase-admin.ts (server)                                          │
│     • firebase-messaging.ts (client)                                      │
│     • notifications.ts (helpers)                                          │
│     • firebase-messaging-sw.js (service worker)                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

✅ STATUS: ALL SYSTEMS OPERATIONAL
🚀 READY FOR PRODUCTION DEPLOYMENT
📱 COMPLETE BLINKIT EXPERIENCE

Generated: February 1, 2026
Version: 2.0 Enhanced Edition
```
