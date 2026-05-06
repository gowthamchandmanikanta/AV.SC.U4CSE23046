# Notification System Design

## Stage 1

### Goal

Design REST APIs for showing notifications to logged-in users. The APIs support creating notifications, listing user notifications, marking notifications as read, deleting notifications, and receiving real-time updates.

### Common Headers

All protected endpoints require:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

### Notification Types

Allowed notification types:

```text
Placement
Result
Event
```

### Create Notification

Endpoint:

```http
POST /api/notifications
```

Request body:

```json
{
  "type": "Placement",
  "message": "Advanced Micro Devices Inc. hiring",
  "targetUserIds": ["student-101", "student-102"],
  "channels": ["in_app", "email"]
}
```

Success response:

```json
{
  "notificationId": "b8c1cc9d-3d94-4a4f-a9c2-f75c97c2cc11",
  "status": "queued",
  "createdAt": "2026-04-22T17:49:42Z"
}
```

### Get Logged-In User Notifications

Endpoint:

```http
GET /api/notifications?limit=20&cursor=next-page-token
```

Success response:

```json
{
  "items": [
    {
      "id": "8a7412bd-6065-4d09-8501-a37f11cc848b",
      "type": "Placement",
      "message": "Advanced Micro Devices Inc. hiring",
      "timestamp": "2026-04-22T17:49:42Z",
      "isRead": false
    }
  ],
  "nextCursor": "next-page-token"
}
```

### Mark Notification As Read

Endpoint:

```http
PATCH /api/notifications/{notificationId}/read
```

Success response:

```json
{
  "notificationId": "8a7412bd-6065-4d09-8501-a37f11cc848b",
  "isRead": true,
  "readAt": "2026-04-22T18:05:00Z"
}
```

### Mark All Notifications As Read

Endpoint:

```http
PATCH /api/notifications/read-all
```

Success response:

```json
{
  "updatedCount": 12,
  "status": "success"
}
```

### Delete Notification

Endpoint:

```http
DELETE /api/notifications/{notificationId}
```

Success response:

```json
{
  "notificationId": "8a7412bd-6065-4d09-8501-a37f11cc848b",
  "status": "deleted"
}
```

### Real-Time Notifications

Use Server-Sent Events because the frontend only needs one-way real-time notification delivery from server to client.

Endpoint:

```http
GET /api/notifications/stream
```

Headers:

```http
Authorization: Bearer <access_token>
Accept: text/event-stream
```

Event payload:

```json
{
  "id": "1cfe5ee-ad37-4894-8946-d707627176a5",
  "type": "Event",
  "message": "tech-fest",
  "timestamp": "2026-04-22T17:50:06Z"
}
```

### Error Response Format

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "A valid authorization token is required"
  }
}
```
