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

## Stage 2

For this notification system, I would use PostgreSQL. The data has clear relations between students and notifications, and we need reliable reads, updates, and filtering by unread notifications.

### Tables

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  type VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_notifications (
  id UUID PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  notification_id UUID NOT NULL REFERENCES notifications(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Insert Notification

```sql
INSERT INTO notifications (id, type, message)
VALUES ('notification-id', 'Placement', 'New placement drive announced');
```

```sql
INSERT INTO student_notifications (id, student_id, notification_id)
VALUES ('row-id', '101', 'notification-id');
```

### Get Student Notifications

```sql
SELECT n.id, n.type, n.message, sn.is_read, sn.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = '101'
ORDER BY sn.created_at DESC
LIMIT 20;
```

### Problems As Data Increases

- Queries can become slow when many students and notifications are stored.
- Marking notifications as read can take more time if there is no proper index.
- Sending notifications to many students can create many rows at once.

### Solutions

- Add indexes on `student_id`, `is_read`, and `created_at`.
- Use pagination instead of loading all notifications.
- Insert notifications in batches for many students.
- Archive old notifications if they are no longer needed frequently.

```sql
CREATE INDEX idx_student_notifications_user
ON student_notifications (student_id, created_at DESC);

CREATE INDEX idx_student_notifications_unread
ON student_notifications (student_id, is_read);
```

## Stage 3

The given query is not fully correct for the schema from Stage 2, because read status is stored in `student_notifications`, not directly in `notifications`.

Original query:

```sql
SELECT *
FROM notifications
WHERE studentID = 1042
  AND isRead = false
ORDER BY createdAt DESC;
```

Better query:

```sql
SELECT n.id, n.type, n.message, sn.is_read, sn.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = '1042'
  AND sn.is_read = false
ORDER BY sn.created_at DESC
LIMIT 20;
```

This query can be slow because the table has many rows. If there is no proper index, the database may scan many notifications for many students and then sort them by date.

### Index For Unread Notifications

```sql
CREATE INDEX idx_student_unread_recent
ON student_notifications (student_id, is_read, created_at DESC);
```

With this index, the database can directly find unread notifications for one student in recent order. The cost becomes closer to `O(log n + limit)` instead of scanning a large table.

Adding indexes on every column is not a good idea. Indexes need extra storage and slow down insert/update operations. We should add indexes only for columns that are used often in `WHERE`, `JOIN`, and `ORDER BY`.

### Placement Notifications In Last 7 Days

```sql
SELECT DISTINCT sn.student_id
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE n.type = 'Placement'
  AND sn.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days';
```

Useful index for this query:

```sql
CREATE INDEX idx_notifications_type
ON notifications (type);

CREATE INDEX idx_student_notifications_date
ON student_notifications (created_at DESC);
```
