# 🔌 Socket.io — E-Scooty IoT Platform

> **Full documentation, architecture, event reference, and future planning for real-time WebSocket communication in the E-Scooty platform.**

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Current Implementation Status](#2-current-implementation-status)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Backend Setup](#4-backend-setup)
5. [Socket Events Reference](#5-socket-events-reference)
   - [Server → Client Events](#51-server--client-events-emitted)
   - [Client → Server Events](#52-client--server-events-listened)
6. [Frontend Socket Usage](#6-frontend-socket-usage)
7. [Data Flow Walkthrough](#7-data-flow-walkthrough)
8. [Known Issues & Problems](#8-known-issues--problems)
9. [Improvement Planning](#9-improvement-planning)
10. [Future Features Roadmap](#10-future-features-roadmap)
11. [Security Hardening Plan](#11-security-hardening-plan)
12. [Testing Guide](#12-testing-guide)

---

## 1. Overview

The E-Scooty platform uses **Socket.io v4** to stream live telemetry data from ESP32/IoT hardware nodes to the React frontend dashboard in real time — without polling.

### Why Socket.io?

| Feature | HTTP Polling | Socket.io |
|---|---|---|
| Latency | ~5000ms (interval) | <100ms |
| Server Load | High (repeated queries) | Low (persistent connection) |
| Emergency Alerts | Delayed | Instant |
| Bi-directional | ❌ No | ✅ Yes |
| Connection Recovery | Manual | Auto-reconnect built-in |

### What is Socket.io Used For in This Project?

- 📡 **Live Telemetry Streaming** — Battery SOC, speed, temperature, GPS from ESP32 to dashboard
- 🚨 **Emergency Alerts** — Accident, overheat, theft, SOS events pushed instantly to all connected clients
- 🔥 **Accident Detection** — Triggers a siren-mode UI animation across all browser sessions
- 🔑 **Ignition Status** — Real-time ignition ON/OFF propagation

---

## 2. Current Implementation Status

### ✅ Already Implemented

| Component | File | Status |
|---|---|---|
| Socket.io Server Setup | `backend/server.js` | ✅ Done |
| io injected into Express `req` | `backend/server.js` | ✅ Done |
| Emit `device-data` on telemetry sync | `backend/controllers/dataController.js` L99, L406, L580, L800 | ✅ Done |
| Emit `emergency-alert` on accident/brake/SOS | `backend/controllers/dataController.js` L453 | ✅ Done |
| Emit `accident-alert` on accident flag | `backend/controllers/dataController.js` L132 | ✅ Done |
| Frontend global emergency socket | `frontend/src/pages/Monitor.jsx` L202–215 | ✅ Done |
| Frontend per-dashboard telemetry socket | `frontend/src/pages/Monitor.jsx` L218–284 | ✅ Done |
| socket.io-client imported in Monitor | `frontend/src/pages/Monitor.jsx` L3 | ✅ Done |

### ⚠️ Issues / Gaps (to be improved)

| Issue | Severity | Details |
|---|---|---|
| **Two separate socket instances** created in Monitor.jsx | 🔴 High | Global emergency socket + per-dashboard socket = 2 connections per user |
| **No socket rooms** — all events broadcast globally | 🟡 Medium | `req.io.emit()` broadcasts to ALL connected clients, not just the relevant device's room |
| **No auth middleware on socket** | 🟡 Medium | Unauthenticated clients can receive all telemetry events |
| **5-second HTTP polling runs alongside socket** | 🟡 Medium | Redundant polling — wastes bandwidth and MongoDB reads |
| **No reconnection strategy** in frontend | 🟡 Medium | If server restarts, existing socket stays broken silently |
| **No socket cleanup on hot reload** | 🟢 Low | Dev mode can stack multiple socket instances |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     E-SCOOTY SYSTEM                             │
│                                                                  │
│  ┌──────────────┐    HTTP POST     ┌────────────────────────┐   │
│  │   ESP32 /    │ ───────────────► │   Express REST API     │   │
│  │  IoT Device  │  /api/escooty    │   (Node.js Backend)    │   │
│  └──────────────┘                  │                        │   │
│                                    │  dataController.js     │   │
│                                    │   ↓ save to MongoDB    │   │
│                                    │   ↓ req.io.emit()      │   │
│                                    └──────────┬─────────────┘   │
│                                               │                  │
│                                    Socket.io Server (v4)         │
│                                    http.createServer(app)        │
│                                               │                  │
│                                    ┌──────────▼──────────────┐  │
│                                    │   Socket.io Namespace   │  │
│                                    │   Default: "/"          │  │
│                                    │                         │  │
│                                    │  Emits:                 │  │
│                                    │   • device-data         │  │
│                                    │   • emergency-alert     │  │
│                                    │   • accident-alert      │  │
│                                    └──────────┬──────────────┘  │
│                                               │                  │
│                              WebSocket (WSS / WS)                │
│                                               │                  │
│  ┌─────────────────────────────────────────── ▼ ─────────────┐  │
│  │                 React Frontend (Vite)                      │  │
│  │                 Monitor.jsx                                │  │
│  │                                                            │  │
│  │  Socket 1 (Global):                                        │  │
│  │   socket.on('emergency-alert') → shows siren UI           │  │
│  │                                                            │  │
│  │  Socket 2 (Per Dashboard):                                 │  │
│  │   socket.on('device-data') → updates KPI cards            │  │
│  │   socket.on('emergency-alert') → updates alert history    │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Backend Setup

### Installation

```bash
# Already installed — socket.io v4.8.3
npm install socket.io
```

### Server Initialization (`backend/server.js`)

```js
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,          // Mirrors back request origin (allow all)
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Inject `io` into every Express request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Basic connection event (currently minimal)
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

// Start server AFTER MongoDB connects
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

> **Key pattern**: `io` is passed to all route handlers via `req.io`. This avoids circular imports and keeps socket logic out of controllers cleanly.

---

## 5. Socket Events Reference

### 5.1 Server → Client Events (Emitted)

#### `device-data`

Fired every time an ESP32 device POSTs telemetry data.

**Where emitted:**
- `dataController.js` line 99 → `receiveData()` (legacy `/api/data`)
- `dataController.js` line 406 → `syncCoreData()` (production `/api/escooty` POST)
- `dataController.js` line 580 → `upsertTelemetry()` (PUT)
- `dataController.js` line 800 → `triggerManualEmergency()` (manual alert)

**Payload:**

```json
{
  "_id": "6842abc123...",
  "deviceId": "ESCT-001",
  "batterySOC": 78.5,
  "batterySOH": 94.2,
  "batteryVoltage": 48.3,
  "batteryTemperature": 32.1,
  "motorTemperature": 41.0,
  "motorRPM": 1200,
  "wheelRPM": 350,
  "speed": 28.4,
  "gpsLatitude": 19.0760,
  "gpsLongitude": 72.8777,
  "ignitionStatus": "ON",
  "brakeStatus": "RELEASED",
  "loss": 0.02,
  "torque": 15.6,
  "warningLevel": "Normal",
  "accidentDetected": false,
  "action": "TELEMETRY_SYNC",
  "timestamp": "2026-06-12T18:30:00.000Z"
}
```

**Frontend listener (Monitor.jsx):**

```js
socket.on('device-data', (data) => {
  if (data.deviceId === selectedDashboard.deviceId) {
    // Filter by enabled features from dashboard config
    setLatestData(filteredData);
    setDeviceData(prev => [filteredData, ...prev].slice(0, 200));
  }
});
```

---

#### `emergency-alert`

Fired when an emergency condition is detected (accident, brake, overheat, SOS, theft).

**Where emitted:**
- `dataController.js` line 453 → inside `syncCoreData()` emergency workflow

**Payload:**

```json
{
  "_id": "...",
  "deviceId": "ESCT-001",
  "action": "Accident Detected",
  "batteryTemperature": 35.0,
  "batterySOC": 65.0,
  "gpsLatitude": 19.0760,
  "gpsLongitude": 72.8777,
  "speed": 45.0,
  "brakeStatus": "APPLIED",
  "mapLink": "https://maps.google.com/?q=19.076,72.877",
  "recipients": ["+919876543210"],
  "siren": true,
  "message": "SMS sent successfully"
}
```

**Frontend listener (Monitor.jsx):**

```js
// Global socket — triggers siren UI for 120 seconds
socket.on('emergency-alert', (alert) => {
  setActiveEmergencyDeviceIds(prev => Array.from(new Set([...prev, alert.deviceId])));
  const expiry = Date.now() + 120000;
  // ... stores to localStorage for persistence across tabs
});

// Per-dashboard socket — appends to alert history list
socket.on('emergency-alert', (alert) => {
  if (alert.deviceId === selectedDashboard.deviceId) {
    setAlertHistory(prev => [alert, ...prev].slice(0, 50));
  }
});
```

**Emergency action triggers:**

| Action String | Trigger Condition |
|---|---|
| `"Accident Detected"` | `accidentDetected: true` from ESP32 |
| `"Accident Detect"` | Alternative string from firmware |
| `"Battery Overheat"` | `warningLevel === 'Danger'` |
| `"SOS Help"` | Manual SOS from rider |
| `"Theft Alert"` | Anti-theft sensor trigger |
| `"Vehicle Theft"` | Alternative theft string |
| `"EMERGENCY_BRAKE"` | `brakeStatus === 'APPLIED'` with non-empty action |

---

#### `accident-alert`

Fired specifically when `accidentDetected: true` is sent by hardware.

**Where emitted:**
- `dataController.js` line 132 → inside legacy `receiveData()`

**Payload:**

```json
{
  "deviceId": "ESCT-001",
  "deviceName": "My E-Scooty",
  "timestamp": "2026-06-12T18:30:00.000Z",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "mapsLink": "https://www.google.com/maps?q=19.076,72.877",
  "message": "⚠️ Accident detected! Help — accident happened at https://..."
}
```

> ⚠️ Note: This event is emitted by the legacy `receiveData()` handler. The production `syncCoreData()` route uses `emergency-alert` instead.

---

### 5.2 Client → Server Events (Listened)

Currently, the frontend **does not send any custom events** to the server. All actions (ignition toggle, etc.) go through REST HTTP calls.

**Planned future client→server events** (see Section 10):

| Event | Purpose |
|---|---|
| `join-device-room` | Client subscribes to a specific deviceId room |
| `leave-device-room` | Client unsubscribes from a device room |
| `ping-device` | Client requests immediate heartbeat from device |

---

## 6. Frontend Socket Usage

### Installation

```bash
# Already installed in frontend package.json
npm install socket.io-client
```

### Current Socket Pattern in Monitor.jsx

```js
import { io } from 'socket.io-client';

// ---- SOCKET 1: Global Emergency Alert (always on) ----
useEffect(() => {
  const socket = io(import.meta.env.VITE_API_URL);

  socket.on('emergency-alert', (alert) => {
    setActiveEmergencyDeviceIds(prev => [...new Set([...prev, alert.deviceId])]);
    // Store in localStorage for cross-tab persistence
    const expiry = Date.now() + 120000;
    const currentExpiries = JSON.parse(localStorage.getItem('emergencyExpiries') || '{}');
    currentExpiries[alert.deviceId] = expiry;
    localStorage.setItem('emergencyExpiries', JSON.stringify(currentExpiries));
  });

  return () => {
    socket.off('emergency-alert');
    socket.disconnect();
  };
}, []); // Runs once on mount

// ---- SOCKET 2: Per-Dashboard Telemetry (re-creates on dashboard change) ----
useEffect(() => {
  if (!selectedDashboard) return;
  const socket = io(import.meta.env.VITE_API_URL);

  socket.on('device-data', (data) => {
    if (data.deviceId === selectedDashboard.deviceId) {
      // Apply feature filter based on dashboard.enabledFeatures
      setLatestData(filteredData);
      setDeviceData(prev => [filteredData, ...prev].slice(0, 200));
    }
  });

  socket.on('emergency-alert', (alert) => {
    if (alert.deviceId === selectedDashboard.deviceId) {
      setAlertHistory(prev => [alert, ...prev].slice(0, 50));
    }
  });

  // HTTP Polling fallback (runs alongside socket — redundant, see Issue #1)
  const fetchData = async () => { /* ... */ };
  fetchData();
  const interval = setInterval(fetchData, 5000);

  return () => {
    clearInterval(interval);
    socket.off('device-data');
    socket.off('emergency-alert');
    socket.disconnect();
  };
}, [selectedDashboard, startDate, endDate]);
```

### Environment Variable

```env
# frontend/.env
VITE_API_URL=https://your-backend-domain.com
```

---

## 7. Data Flow Walkthrough

### Telemetry Flow (Normal)

```
ESP32 Device
    │
    │  POST /api/escooty
    │  Body: { deviceId, batterySOC, speed, gpsLatitude, ... }
    │
    ▼
dataController.syncCoreData()
    │
    ├── Validate device exists in DB
    ├── Normalize field values (ignition, brake, headlight)
    ├── Calculate warningLevel from temperature
    ├── Save to MongoDB (DeviceData collection)
    │
    ├── req.io.emit('device-data', newData)  ◄── Real-time push
    │
    └── Return HTTP 201
    
Browser (Monitor.jsx)
    │
    ├── socket.on('device-data') fires
    ├── Filter by deviceId === selectedDashboard.deviceId
    ├── Filter fields by dashboard.enabledFeatures
    ├── setLatestData(filteredData)   ◄── KPI cards update
    └── setDeviceData([...])          ◄── Chart updates
```

### Emergency Alert Flow

```
ESP32 Device
    │
    │  POST /api/escooty
    │  Body: { deviceId, action: "Accident Detected", brakeStatus: "APPLIED", ... }
    │
    ▼
dataController.syncCoreData()
    │
    ├── Save telemetry to DeviceData
    ├── req.io.emit('device-data', newData)
    │
    ├── Check: isValidEmergencyAction || isBrakeEmergency
    │
    ├── Create AlertHistory record in MongoDB
    ├── triggerEmergencyAlerts() → SMS via Resend API
    │
    └── req.io.emit('emergency-alert', { ...alert, siren: true })
    
Browser (Monitor.jsx)
    │
    ├── Global socket: setActiveEmergencyDeviceIds([...])
    │                  localStorage.emergencyExpiries[deviceId] = now + 120s
    │
    ├── UI: Red siren banner animates for 120 seconds
    ├── UI: "ACCIDENT DETECTED" full-screen alert
    ├── UI: Google Maps link for GPS location
    │
    └── Per-dashboard socket: setAlertHistory([alert, ...])
```

---

## 8. Known Issues & Problems

### 🔴 Issue #1: Two Socket Connections Per User

**Problem:** Monitor.jsx creates **2 separate socket.io connections** simultaneously — one for global emergency alerts and one for per-dashboard telemetry. This doubles server connection count.

**Current Code:**
```js
// Socket 1 (global, line 203)
useEffect(() => {
  const socket = io(import.meta.env.VITE_API_URL);  // Connection 1
  socket.on('emergency-alert', ...);
}, []);

// Socket 2 (per-dashboard, line 220)
useEffect(() => {
  const socket = io(import.meta.env.VITE_API_URL);  // Connection 2
  socket.on('device-data', ...);
  socket.on('emergency-alert', ...);
}, [selectedDashboard]);
```

**Fix:** Merge into a single socket using a `useRef` to persist it.

---

### 🟡 Issue #2: No Socket Rooms — Global Broadcast

**Problem:** `req.io.emit()` broadcasts every `device-data` event to **all connected browser sessions**, even those monitoring different devices. Each client filters in JavaScript, wasting bandwidth.

**Current:**
```js
req.io.emit('device-data', newData); // Every client receives every device's data
```

**Fix:** Use Socket.io rooms to target specific device subscribers:
```js
req.io.to(`device:${deviceId}`).emit('device-data', newData);
```

---

### 🟡 Issue #3: No Authentication on Socket Connection

**Problem:** Any WebSocket client can connect to the socket and receive all broadcast events without a JWT token.

**Fix:** Use Socket.io middleware to verify JWT on connection:
```js
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

---

### 🟡 Issue #4: HTTP Polling Runs Alongside Socket

**Problem:** A 5-second `setInterval` HTTP fetch runs in parallel with socket updates in Monitor.jsx, causing duplicate data loads and unnecessary API load.

```js
// Both run simultaneously:
socket.on('device-data', ...);         // Real-time
const interval = setInterval(fetchData, 5000); // Polling backup
```

**Fix:** Keep polling only as a fallback for when socket is disconnected.

---

### 🟡 Issue #5: `emergency-alert` Listened Twice

**Problem:** The `emergency-alert` event is registered on two separate socket instances, causing duplicate `setAlertHistory` appends if both fire.

---

## 9. Improvement Planning

### Phase 1 — Consolidate Sockets (Quick Fix)

**Priority:** 🔴 High | **Effort:** Small

**Plan:** Create a custom `useSocket` hook that returns a single, persistent socket reference using `useRef`.

```js
// frontend/src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      auth: { token },               // Send JWT for server-side auth
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket'],     // Skip polling transport
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return socketRef;
}
```

**Usage in Monitor.jsx:**
```js
const socketRef = useSocket();

useEffect(() => {
  const socket = socketRef.current;
  if (!socket) return;

  socket.on('device-data', handleDeviceData);
  socket.on('emergency-alert', handleEmergency);

  return () => {
    socket.off('device-data', handleDeviceData);
    socket.off('emergency-alert', handleEmergency);
  };
}, [selectedDashboard]);
```

---

### Phase 2 — Implement Socket Rooms (Scalability)

**Priority:** 🟡 Medium | **Effort:** Medium

**Backend changes:**

```js
// server.js — on client connect, let them join device-specific rooms
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  // Client joins a device room
  socket.on("join-device-room", (deviceId) => {
    socket.join(`device:${deviceId}`);
    console.log(`Socket ${socket.id} joined room device:${deviceId}`);
  });

  // Client leaves a device room
  socket.on("leave-device-room", (deviceId) => {
    socket.leave(`device:${deviceId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});
```

**Controller changes:**

```js
// dataController.js — target specific room instead of all clients
req.io.to(`device:${deviceId}`).emit('device-data', newData);
req.io.to(`device:${deviceId}`).emit('emergency-alert', alertPayload);

// Still broadcast emergency alerts globally (all dashboards need to show siren)
req.io.emit('emergency-alert', alertPayload);
```

**Frontend changes:**

```js
useEffect(() => {
  if (!selectedDashboard) return;
  const socket = socketRef.current;

  // Subscribe to this device's room
  socket.emit('join-device-room', selectedDashboard.deviceId);

  return () => {
    socket.emit('leave-device-room', selectedDashboard.deviceId);
  };
}, [selectedDashboard]);
```

---

### Phase 3 — JWT Auth Middleware on Socket (Security)

**Priority:** 🟡 Medium | **Effort:** Small

```js
// server.js
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token provided'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});
```

---

### Phase 4 — Remove Redundant Polling (Cleanup)

**Priority:** 🟡 Medium | **Effort:** Small

Replace the always-on polling with a smart fallback:

```js
// Only poll if socket is disconnected
useEffect(() => {
  const socket = socketRef.current;
  let interval = null;

  const startPolling = () => {
    interval = setInterval(fetchData, 5000);
  };

  const stopPolling = () => {
    clearInterval(interval);
  };

  socket.on('connect', stopPolling);
  socket.on('disconnect', () => {
    startPolling(); // Fallback to polling when socket drops
  });

  // Initial fetch for history on mount
  fetchData();

  return () => stopPolling();
}, [selectedDashboard]);
```

---

## 10. Future Features Roadmap

### 🗺️ Feature: Device-Specific Ignition Push (Server → ESP32)

**Goal:** When admin toggles ignition from the dashboard, push the command to the hardware via socket instead of requiring the ESP32 to poll.

**Implementation:**
```js
// Backend: Emit to a device namespace
io.to(`device:${deviceId}`).emit('ignition-command', { ignitionStatus: 'ON' });

// ESP32 side (via socket.io Arduino client or MQTT bridge):
// Listen for 'ignition-command' and toggle relay
```

---

### 🗺️ Feature: Multi-Device Overview Socket

**Goal:** Dashboard overview page (`/`) gets a `device-summary` event every 10 seconds with latest status for all devices — without the full telemetry payload.

```js
// Backend: Scheduled broadcast
setInterval(async () => {
  const summaries = await DeviceData.aggregate([...]);
  io.emit('device-summary', summaries);
}, 10000);
```

---

### 🗺️ Feature: Socket Namespace Isolation

**Goal:** Separate namespaces for different concerns.

```js
const telemetryNS = io.of('/telemetry');
const emergencyNS = io.of('/emergency');
const adminNS = io.of('/admin');
```

---

### 🗺️ Feature: OTA Progress Streaming

**Goal:** When an OTA firmware update is pushed, stream `ota-progress` events to the UI.

```js
req.io.to(`device:${deviceId}`).emit('ota-progress', {
  deviceId,
  progress: 45,    // percent
  status: 'Flashing'
});
```

---

### 🗺️ Feature: Connection Status Indicator

**Goal:** Show a live "Socket Connected" / "Socket Reconnecting" badge in the Monitor UI.

```js
const [socketStatus, setSocketStatus] = useState('connecting');

socket.on('connect', () => setSocketStatus('connected'));
socket.on('disconnect', () => setSocketStatus('disconnected'));
socket.on('reconnecting', () => setSocketStatus('reconnecting'));
```

---

## 11. Security Hardening Plan

| Risk | Current Status | Fix |
|---|---|---|
| Unauthenticated socket access | ⚠️ Open to all | Add JWT middleware (Phase 3) |
| CORS too permissive (`origin: true`) | ⚠️ Allows all | Restrict to specific frontend domain |
| No rate limiting on socket events | ⚠️ None | Implement event-level rate limiting |
| `req.io.emit()` broadcasts all data | ⚠️ No filtering | Use rooms (Phase 2) |
| No namespace isolation | ⚠️ Single namespace | Implement namespaces (Roadmap) |

### Recommended Production CORS Config

```js
const io = new Server(server, {
  cors: {
    origin: [
      "https://your-frontend-domain.com",
      "https://www.your-frontend-domain.com"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
```

---

## 12. Testing Guide

### Test Socket Events with Postman / wscat

```bash
# Install wscat
npm install -g wscat

# Connect to socket
wscat -c "ws://localhost:5000/socket.io/?EIO=4&transport=websocket"
```

### Simulate a Device Telemetry POST

```bash
curl -X POST https://your-api.com/api/escooty \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESCT-001",
    "batterySOC": 75,
    "batteryVoltage": 48.2,
    "speed": 30,
    "latitude": 19.076,
    "longitude": 72.877,
    "ignitionStatus": "ON",
    "action": "TELEMETRY_SYNC"
  }'
```

Expected: Browser Monitor page updates KPI cards in < 100ms.

### Simulate an Emergency Alert

```bash
curl -X POST https://your-api.com/api/escooty \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESCT-001",
    "action": "Accident Detected",
    "brakeStatus": "APPLIED",
    "latitude": 19.076,
    "longitude": 72.877
  }'
```

Expected: Red siren banner appears in browser, SMS sent to emergency contacts.

### Monitor Socket Events in Browser Console

```js
// Open browser DevTools console on Monitor page
// Intercept socket events for debugging
window._socketDebug = true;

// In Monitor.jsx, add temporarily:
socket.onAny((event, ...args) => {
  if (window._socketDebug) console.log('[Socket Event]', event, args);
});
```

---

## 📦 Package Versions

| Package | Version | Location |
|---|---|---|
| `socket.io` | `^4.8.3` | `backend/package.json` |
| `socket.io-client` | (installed in frontend) | `frontend/package.json` |

---

## 🔗 Related Files

| File | Role |
|---|---|
| [`backend/server.js`](./backend/server.js) | Socket.io server initialization |
| [`backend/controllers/dataController.js`](./backend/controllers/dataController.js) | All socket emit calls |
| [`frontend/src/pages/Monitor.jsx`](./frontend/src/pages/Monitor.jsx) | All socket listeners |
| [`backend/models/DeviceData.js`](./backend/models/DeviceData.js) | Telemetry data schema |
| [`backend/models/AlertHistory.js`](./backend/models/AlertHistory.js) | Emergency alert schema |

---

*Last updated: 2026-06-12 | E-Scooty IoT Platform*
