# E-Scooty Dashboard API Documentation

This document outlines the core API endpoints for synchronizing telemetry data between the vehicle nodes (hardware) and the monitoring dashboard.

---

## 1. Core Telemetry Synchronization — `/api/escooty`

All telemetry CRUD operations are handled at this unified base endpoint.

### `POST /api/escooty` — Create New Telemetry Record
**Description:** Send real-time telemetry from the E-Scooty node. Creates a **new** record every call.

### `PUT /api/escooty` — Update/Create Telemetry Record
**Description:** Same body as POST. **Creates a new record** in the history buffer. This ensures every update generates a new entry in the history logs.

### Request Body (JSON) — same for POST and PUT
The server is flexible and accepts both standard and hardware-specific field names.

| Standard Field | Fallback Field | Type | Description |
| :--- | :--- | :--- | :--- |
| `deviceId` | — | `String` | **Required**. Unique identifier (e.g., `"es"`). |
| `speed` | `Speed` | `Number` | Velocity in km/h. |
| `batterySOC` | — | `Number` | State of Charge (0-100). |
| `batterySOH` | — | `Number` | State of Health (0-100). |
| `batteryVoltage`| — | `Number` | Battery potential in Volts. |
| `latitude` | `gpsLatitude` | `Number` | GPS Latitude. |
| `longitude` | `gpsLongitude`| `Number` | GPS Longitude. |
| `brakeStatus` | — | `String/Num` | `"APPLIED"` (1) or `"RELEASED"` (0). |
| `action` | — | `String` | Event label (e.g., `"TELEMETRY_SYNC"`). |

### Example Request Body
```json
{
  "deviceId": "es",
  "batterySOC": 85.5,
  "batterySOH": 98.2,
  "batteryVoltage": 48.7,
  "speed": 25.4,
  "latitude": 22.5726,
  "longitude": 88.3639,
  "brakeStatus": "RELEASED",
  "action": "TELEMETRY_SYNC"
}
```

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Core telemetry synchronized",
  "data": {
    "deviceId": "es",
    "speed": 25.4,
    "batterySOC": 85.5,
    "batteryVoltage": 48.7,
    "brakeStatus": "RELEASED",
    "timestamp": "2024-04-27T10:00:00.000Z"
  }
}
```

---

## 2. Fetch Device History
**Endpoint:** `GET /api/data/history/:deviceId`  
**Description:** Retrieves the last 100 telemetry records for the specified device. Used to populate the "Device History Buffer" in the Analytics tab.

---

## 3. Emergency Brake Timestamp Log
**Endpoint:** `GET /api/data/emergency-logs/:deviceId`  
**Description:** Retrieves a specialized log of all events where the emergency brake was engaged.

---

## 4. Dashboard Management — `/api/escooty/register`
**Endpoint:** `POST /api/escooty/register`  
**Description:** Registers a new dashboard/node configuration.

---

> [!IMPORTANT]
> All local requests should be directed to `http://localhost:5115/api/escooty`. Ensure your `Authorization` header contains a valid Bearer token for protected routes.
