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
  "speed": 25.4,
  "brakeStatus": "RELEASED",
  "gpsLatitude": 20.2961,
  "gpsLongitude": 85.8245,
  "action": "TELEMETRY_SYNC"
}
```

### `PUT /api/escooty` — Update Telemetry
**Description:** Upserts the latest telemetry record for the device.

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

---

## 4. Temperature Thresholds (Auto-Trigger)
The system automatically monitors `batteryTemperature` and sends SMS alerts if:
*   **Danger Level:** Above 55°C (Triggers "Battery Overheat" SMS).
*   **Accident Detection:** If `accidentDetected` flag is set in telemetry.

---

> [!IMPORTANT]
> All local requests should be directed to `http://localhost:5115`. Ensure your `Authorization` header contains a valid Bearer token.
