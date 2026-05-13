# E-Scooty Dashboard API Documentation

This document outlines the core API endpoints for synchronizing telemetry data between the vehicle nodes (hardware) and the monitoring dashboard.

---

## 🚀 Postman Integration Guide

If you are using Postman to test these APIs, follow these steps to avoid common errors:

1.  **Port**: Use `http://localhost:5115` for all requests.
2.  **Authorization**: 
    *   Go to the **Authorization** tab in Postman.
    *   Select **Type**: `Bearer Token`.
    *   Paste your admin token (received from the Login API) into the **Token** field.
3.  **Headers**: Ensure `Content-Type: application/json` is set in the Headers tab.
4.  **DELETE Methods**: 
    *   For **Section 4.3** (Dashboard removal), use the URL path: `/api/escooty/node/YOUR_DEVICE_ID`.
    *   For **Section 1**, use query parameters: `/api/escooty?deviceId=YOUR_DEVICE_ID`.

---

## 1. Core Telemetry Synchronization — `/api/escooty`

All telemetry CRUD operations are handled at this unified base endpoint.

### `POST /api/escooty` — Create New Telemetry Record
**Description:** Send real-time telemetry from the E-Scooty node. Creates a **new** record every call.

### `PUT /api/escooty` — Update/Create Telemetry Record
**Description:** Same body as POST. **Creates a new record** in the history buffer.

### `DELETE /api/escooty` — Clear Telemetry Data
**Description:** Deletes ALL telemetry history for a specific device.  
**Postman Setup:** In the **Params** tab, add `deviceId` = `your_id`.

---

## 4. Dashboard Management — `/api/escooty`

### 4.1 Register New Dashboard
**Endpoint:** `POST /api/escooty/register`  
**Access:** Admin Only  
**Body (JSON):**
```json
{
  "dashboardName": "Phoenix Squadron-1",
  "deviceId": "SCOOTY-001",
  "location": "Urban Sector A"
}
```

### 4.2 Delete Dashboard (by Database ID)
**Endpoint:** `DELETE /api/escooty/:id`  
**Access:** Admin Only  
**Parameter:** `:id` is the internal MongoDB `_id`.

### 4.3 Delete Dashboard (by Device ID)
**Endpoint:** `DELETE /api/escooty/node/:deviceId`  
**Access:** Admin Only  
**Description:** Permanently removes a dashboard configuration.

**Example URL:** `http://localhost:5115/api/escooty/node/es`

---

> [!IMPORTANT]
> All local requests should be directed to `http://localhost:5115`. Ensure your `Authorization` header contains a valid Bearer token for protected routes.
