# Notification System Design

## Stage 1

The notification system should allow a logged-in student to see notifications related to placements, events, and results. The backend can expose simple REST APIs for creating, reading, updating, and deleting notifications. Since users are already logged in, every request should send the authorization token in the header.

### Common Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### 1. Create Notification

This API can be used by the backend/admin service to create a notification for one or more students.

```http
POST /api/notifications
```

Request:

```json
{
  "type": "Placement",
  "message": "New placement drive announced",
  "studentIds": ["101", "102", "103"]
}
```

Response:

```json
{
  "id": "notification-id",
  "message": "notification created successfully"
}
```

### 2. Get Notifications

This API returns notifications for the logged-in student. Pagination is added so the response does not become too large.

```http
GET /api/notifications?limit=20&page=1
```

Response:

```json
{
  "notifications": [
    {
      "id": "notification-id",
      "type": "Placement",
      "message": "New placement drive announced",
      "isRead": false,
      "createdAt": "2026-04-22T17:49:42Z"
    }
  ]
}
```

### 3. Mark Notification As Read

```http
PATCH /api/notifications/{id}/read
```

Response:

```json
{
  "id": "notification-id",
  "isRead": true
}
```

### 4. Mark All As Read

```http
PATCH /api/notifications/read-all
```

Response:

```json
{
  "message": "all notifications marked as read"
}
```

### 5. Delete Notification

```http
DELETE /api/notifications/{id}
```

Response:

```json
{
  "message": "notification deleted successfully"
}
```

### Real-Time Notifications

For real-time updates, Server-Sent Events can be used because notifications are mainly sent from server to client.

```http
GET /api/notifications/stream
```

Response event:

```json
{
  "id": "notification-id",
  "type": "Event",
  "message": "Tech fest registration opened",
  "createdAt": "2026-04-22T17:50:06Z"
}
```

### Error Response

```json
{
  "message": "unauthorized request"
}
```
