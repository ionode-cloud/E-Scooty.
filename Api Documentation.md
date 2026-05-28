# E-Scooty Dashboard API Documentation

This document outlines the core API endpoints for synchronizing telemetry data between the vehicle nodes (hardware) and the monitoring dashboard, including the new Battery Thermal and Emergency Alert systems.

---

## 🚀 Postman Integration Guide

1.  **Port**: Use `http://localhost:5115` for all requests.
2.  **Authorization**: 
    *   **Type**: `Bearer Token`.
    *   **Token**: Use your admin/user token received from Login.
3.  **Headers**: Ensure `Content-Type: application/json`.

---

## 1. Core Telemetry Synchronization — `/api/escooty`

### `POST /api/escooty` — Create New Telemetry Record
**Description:** Send real-time telemetry from the E-Scooty node.
**Body (JSON):**
```json
{
  "deviceId": "ES101",
  "batterySOC": 85.5,
  "batterySOH": 98.2,
  "batteryVoltage": 48.2,
  "batteryTemperature": 32,
  "motorTemperature": 45.0,
  "motorRPM": 1200,
  "speed": 25.4,
  "brakeStatus": "RELEASED",
  "gpsLatitude": 20.2961,
  "gpsLongitude": 85.8245,
  "ignitionStatus": "ON",
  "action": "TELEMETRY_SYNC"
}
```

**New Fields:**
| Field | Type | Values | Description |
|---|---|---|---|
| `motorTemperature` | Number | e.g. `45.0` | Motor temperature in °C |
| `motorRPM` | Number | e.g. `1200` | Motor revolutions per minute |
| `ignitionStatus` | String | `"ON"` / `"OFF"` | Current ignition state |

### `PUT /api/escooty` — Update Telemetry
**Description:** Upserts the latest telemetry record for the device.

---

## 1b. Ignition Control — `/api/escooty/ignition`

### `POST /api/escooty/ignition` — Set Ignition State
**Description:** Remotely set the ignition switch ON or OFF for a device. Emits a real-time socket event to all connected clients.
**Body (JSON):**
```json
{
  "deviceId": "ES101",
  "ignitionStatus": "ON"
}
```
*Valid values for `ignitionStatus`:* `"ON"`, `"OFF"`

**Response:**
```json
{
  "success": true,
  "message": "Ignition set to ON for device ES101",
  "ignitionStatus": "ON"
}
```

---

## 2. Emergency Alert System — `/api/escooty/emergency`

### `POST /api/escooty/emergency` — Trigger Manual Alert
**Description:** Manually triggers an SMS alert to all saved emergency contacts.
**Body (JSON):**
```json
{
  "deviceId": "ES101",
  "alertType": "Battery Overheat" 
}
```
*Valid Alert Types:* `Battery Overheat`, `Accident Detected`, `Vehicle Theft`, `SOS Help`.

---

## 3. Dashboard Management — `/api/escooty`

### 3.1 Register New Dashboard
**Endpoint:** `POST /api/escooty/register`  
**Body (JSON):**
```json
{
  "dashboardName": "E-Scooty ES101",
  "deviceId": "ES101",
  "emergencyContacts": ["+919876543210", "+919988776655"],
  "description": "Premium Fleet Unit"
}
```

### 3.2 Delete Dashboard (by Device ID)
**Endpoint:** `DELETE /api/escooty/node/:deviceId`  
**Description:** Removes dashboard and purges all telemetry history.

### 3.3 Full Dashboard CRUD API — `/api/escooty/dashboard`
**Description:** Complete CRUD operations for managing E-Scooty dashboards.

---

#### `GET /api/escooty/dashboard` — Get All Dashboards
**Description:** Returns a list of all registered dashboards.

**Request:** No body required.

**Response (200 — JSON Array):**
```json
[
  {
    "_id": "60d5ec4b868e821f584f2e5a",
    "dashboardName": "E-Scooty ES101",
    "deviceId": "ES101",
    "particleId": "7a3592bc13d5089f2a24ec6f",
    "enabledFeatures": ["batterySOC", "batteryVoltage", "gps"],
    "description": "Premium Fleet Unit",
    "emergencyContacts": ["+919876543210"],
    "createdAt": "2026-05-01T08:00:00.000Z",
    "updatedAt": "2026-05-28T10:00:00.000Z"
  }
]
```

---

#### `POST /api/escooty/dashboard` — Create Dashboard
**Description:** Registers a new dashboard. Sends a Welcome SMS to all emergency contacts on success.

**Body (JSON):**
```json
{
  "dashboardName": "E-Scooty ES101",
  "deviceId": "ES101",
  "enabledFeatures": ["batterySOC", "batteryVoltage", "gps"],
  "description": "Premium Fleet Unit",
  "emergencyContacts": ["+919876543210", "+919988776655"]
}
```

**Field Reference:**

| Field | Type | Required | Description |
|---|---|---|---|
| `dashboardName` | String | ✅ | Display name for the dashboard |
| `deviceId` | String | ✅ | Unique hardware ID (e.g. `ES101`) |
| `enabledFeatures` | String[] | ❌ | Features to display on the dashboard |
| `description` | String | ❌ | Short description of the unit |
| `emergencyContacts` | String[] | ❌ | Indian phone numbers (max 10, format: `+91XXXXXXXXXX`) |

**Available `enabledFeatures` values:**
`batterySOC`, `batteryVoltage`, `batteryTemperature`, `motorTemperature`, `motorRPM`, `wheelRPM`, `loss`, `torque`, `gps`, `ignitionSwitch`, `batterySOH`, `speed`, `systemStatus`

**Response (201):**
```json
{
  "_id": "60d5ec4b868e821f584f2e5a",
  "dashboardName": "E-Scooty ES101",
  "deviceId": "ES101",
  "particleId": "auto-generated-hex-id",
  "enabledFeatures": ["batterySOC", "batteryVoltage", "gps"],
  "description": "Premium Fleet Unit",
  "emergencyContacts": ["+919876543210"]
}
```

---

#### `PUT /api/escooty/dashboard/:id` — Update Dashboard
**Description:** Updates an existing dashboard by its MongoDB `_id`.

**Example:** `PUT /api/escooty/dashboard/60d5ec4b868e821f584f2e5a`

**Body (JSON) — include only fields to update:**
```json
{
  "dashboardName": "Updated E-Scooty ES101",
  "enabledFeatures": ["batterySOC", "batteryVoltage", "gps", "batteryTemperature"],
  "emergencyContacts": ["+919876543210", "+917788996655"]
}
```

**Response (200):**
```json
{
  "_id": "60d5ec4b868e821f584f2e5a",
  "dashboardName": "Updated E-Scooty ES101",
  "deviceId": "ES101",
  "enabledFeatures": ["batterySOC", "batteryVoltage", "gps", "batteryTemperature"],
  "updatedAt": "2026-05-28T14:30:00.000Z"
}
```

**Response (404):**
```json
{ "message": "Dashboard not found" }
```

---

#### `DELETE /api/escooty/dashboard/:id` — Delete Dashboard
**Description:** Permanently deletes a dashboard record by its MongoDB `_id`.

**Example:** `DELETE /api/escooty/dashboard/60d5ec4b868e821f584f2e5a`

**Response (200):**
```json
{ "message": "Dashboard deleted successfully" }
```

**Response (404):**
```json
{ "message": "Dashboard not found" }
```

---

## 4. Find Device by Device ID — `/api/escooty/:deviceId`

Lookup, update, or delete a **Device** record using its human-readable `deviceId` string (e.g., `ES101`).

### `GET /api/escooty/:deviceId` — Get Device
**Description:** Fetch a single device by its `deviceId`.

**Example:** `GET /api/escooty/ES101`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "deviceName": "E-Scooty Alpha",
    "deviceId": "ES101",
    "location": "Bhubaneswar",
    "status": "Online",
    "otaUpdatePending": false,
    "otaFirmwareUrl": "",
    "lastSeen": "2026-05-28T10:00:00.000Z"
  }
}
```

**Response (404):**
```json
{ "success": false, "message": "Device \"ES101\" not found." }
```

---

### `PUT /api/escooty/:deviceId` — Update Device
**Description:** Update one or more fields of a device by `deviceId`.

**Example:** `PUT /api/escooty/ES101`

**Body (JSON) — include only fields to update:**
```json
{
  "deviceName": "E-Scooty Alpha v2",
  "location": "Cuttack",
  "status": "Online"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Device \"ES101\" updated successfully.",
  "data": { ... }
}
```

---

### `DELETE /api/escooty/:deviceId` — Delete Device
**Description:** Permanently removes the device record by `deviceId`.

**Example:** `DELETE /api/escooty/ES101`

**Response (200):**
```json
{ "success": true, "message": "Device \"ES101\" deleted successfully." }
```

---

## 5. Temperature Thresholds (Auto-Trigger)
The system automatically monitors `batteryTemperature` and sends SMS alerts if:
*   **Danger Level:** Above 55°C (Triggers "Battery Overheat" SMS).
*   **Accident Detection:** If `accidentDetected` flag is set in telemetry.

---

> [!IMPORTANT]
> All local requests should be directed to `http://localhost:5115`. Ensure your `Authorization` header contains a valid Bearer token.
