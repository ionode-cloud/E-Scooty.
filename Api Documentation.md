# E-Scooty Dashboard API Documentation

This document outlines the core API endpoints for synchronizing telemetry data between the vehicle nodes (hardware) and the monitoring dashboard.

---

## 1. Core Telemetry Synchronization
**Endpoint:** `POST /api/escooty/dashboard`  
**Description:** Use this endpoint to send real-time telemetry from the E-Scooty node. This is the primary feed for the Analytics History Buffer and Dashboard Monitor.

### Request Body (JSON)
| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `deviceId` | `String` | **Required**. Unique identifier for the vehicle node. | `"SCOOTY-001"` |
| `timestamp` | `ISO-8601` | Optional. Time of data collection. Defaults to Server Time. | `"2024-04-27T10:00:00Z"` |
| `batterySOC` | `Number` | State of Charge (0-100). | 85.5 |
| `batterySOH` | `Number` | State of Health (0-100). | 98.2 |
| `batteryVoltage` | `Number` | Current battery potential in Volts. | 48.7 |
| `brakeStatus` | `Number/String` | `1` or `"APPLIED"` if emergency brake is active; else `0` or `"RELEASED"`. | 1 |
| `latitude` | `Number` | GPS Latitude coordinate. | 22.5726 |
| `longitude` | `Number` | GPS Longitude coordinate. | 88.3639 |
| `action` | `String` | Categorical label for the event. | `"TELEMETRY_SYNC"` |

### Success Response (201 Created)
```json

{
  "success": true,
  "message": "Core telemetry synchronized",
  "data": {
    "node": "SCOOTY-001",
    "status": "APPLIED",
    "action": "TELEMETRY_SYNC"
  }
}
```

---

## 2. Fetch Device History
**Endpoint:** `GET /api/data/history/:deviceId`  
**Description:** Retrieves the last 100 telemetry records for the specified device. Used to populate the "Device History Buffer".

### Success Response (200 OK)
```json
[
  {
    "deviceId": "SCOOTY-001",
    "batterySOC": 85.5,
    "batterySOH": 98.2,
    "batteryVoltage": 48.7,
    "brakeStatus": "APPLIED",
    "gpsLatitude": 22.5726,
    "gpsLongitude": 88.3639,
    "action": "TELEMETRY_SYNC",
    "timestamp": "2024-04-27T10:00:00.000Z"
  }
]
```

---

## 3. Emergency Brake Timestamp Log
**Endpoint:** `GET /api/data/emergency-logs/:deviceId`  
**Description:** Retrieves a specialized log of all events where the emergency brake was engaged (`brakeStatus: "APPLIED"`). This is used for the safety audit card on the dashboard.

### Success Response (200 OK)
```json
[
  {
    "id": "65f1...",
    "timestamp": "2024-04-27T10:05:00.000Z",
    "deviceId": "SCOOTY-001",
    "action": "EMERGENCY_TRIGGER"
  }
]
```

---

## 4. Update Telemetry Record
**Endpoint:** `PUT /api/data/record/:id`  
**Description:** Updates a specific telemetry log entry by its database ID.  
**Access:** Admin Only (`protect`, `admin`).

### Request Body (JSON)
Any field from the `DeviceData` schema can be sent.
```json
{
  "batterySOC": 90,
  "action": "MANUAL_CORRECTION"
}
```

---

## 4. Delete Telemetry Record
**Endpoint:** `DELETE /api/data/record/:id`  
**Description:** Permanently removes a specific telemetry log entry.  
**Access:** Admin Only.

---

## 5. Clear Device History
**Endpoint:** `DELETE /api/data/history/:deviceId`  
**Description:** Wipes all telemetry logs for a specific vehicle node. Use with caution.  
**Access:** Admin Only.

---

## 8. E-Scooty Management (Unified CRUD)
The `/api/escooty` namespace provides a unified interface for managing both monitoring dashboards and hardware nodes.

### 8.1 Dashboard Management
**Endpoint:** `/api/escooty/dashboard`

- **GET `/`**: Retrieve all dashboard configurations.
  - **Full URL:** `http://localhost:5113/api/escooty/dashboard`
- **POST `/register`**: Create a new dashboard entry. (Admin)
  - **Full URL:** `http://localhost:5113/api/escooty/dashboard/register`
  - **Body (JSON):**
    ```json
    {
      "dashboardName": "Phoenix Squadron-1",
      "deviceId": "SCOOTY-001",
      "description": "High-performance urban node",
      "owner": "Logistics Alpha"
    }
    ```
- **PUT `/:id`**: Update dashboard details. (Admin)
  - **Full URL:** `http://localhost:5113/api/escooty/dashboard/{id}`
  - **Body (JSON):**
    ```json
    {
      "dashboardName": "Phoenix Squadron-1 (Updated)",
      "description": "Upgraded with rapid-sync kernel"
    }
    ```
- **DELETE `/:id`**: Remove a dashboard. (Admin)
  - **Full URL:** `http://localhost:5113/api/escooty/dashboard/{id}`

### 8.2 Device Management
**Endpoint:** `/api/escooty/device`

- **GET `/`**: List all registered hardware nodes.
- **POST `/`**: Register a new vehicle node. (Admin)
  - **Body (JSON):**
    ```json
    {
      "deviceId": "SCOOTY-001",
      "deviceName": "Urban Glide X1",
      "type": "E-Scooty",
      "status": "active"
    }
    ```
- **PUT `/:id`**: Update device metadata or status. (Admin)
  - **Body (JSON):**
    ```json
    {
      "status": "maintenance",
      "deviceName": "Urban Glide X1 (Repairing)"
    }
    ```
- **DELETE `/:id`**: Unregister a device. (Admin)

---

## 9. Real-time Events (Socket.io)
The server broadcasts events over Socket.io for immediate UI updates.

- **Event:** `device-data`  
  Payload: Full `DeviceData` object.
- **Event:** `accident-alert`  
  Payload: Object containing `deviceId`, `mapsLink`, and emergency message.

---

## 7. Excel Export
**Endpoint:** `GET /api/data/download`  
**Query Params:** `deviceId`, `startDate`, `endDate`  
**Description:** Generates an Excel report of the history buffer.

---

> [!IMPORTANT]
> All `PUT` and `DELETE` operations require administrative privileges. Ensure your `Authorization` header contains a valid admin Bearer token.
