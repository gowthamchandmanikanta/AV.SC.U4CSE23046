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

## Stage 4

Fetching notifications on every page load for every student can put too much load on the database. It also gives a slow experience because the same data may be requested again and again.

### Suggested Improvements

Use pagination or limit:

```http
GET /api/notifications?limit=20&page=1
```

Only the latest few notifications should be loaded first. Older notifications can be loaded when the user scrolls or clicks next page.

Use caching:

Recent notifications for a student can be cached in Redis for a short time, like 1 or 2 minutes. This reduces repeated database calls.

Tradeoff: cache can sometimes show slightly old data, so cache should be cleared when a new notification is added or when a notification is marked as read.

Use unread count API:

Instead of loading all notifications on every page, the frontend can first call:

```http
GET /api/notifications/unread-count
```

Response:

```json
{
  "unreadCount": 5
}
```

Then full notifications can be fetched only when the user opens the notification panel.

Use real-time updates:

For new notifications, Server-Sent Events can push updates to logged-in users. This avoids repeated polling from the frontend.

Tradeoff: real-time connections need more server resources, so they should be used only for active logged-in users.

Use proper indexes:

```sql
CREATE INDEX idx_student_notifications_recent
ON student_notifications (student_id, created_at DESC);
```

This helps fetch recent notifications quickly for one student.

### Final Approach

I would use pagination, indexing, short-term caching, and real-time updates. The frontend should not fetch full notifications on every page load. It should fetch unread count first and load full notifications only when required.

## Stage 5

The given implementation is not reliable for 50,000 students because everything is done one by one inside a loop.

### Shortcomings

- If `send_email` fails for one student, the next steps may also be affected.
- It will be slow because email API, database insert, and app notification are all called one by one.
- There is no retry for failed emails.
- There is no batching, so the database gets too many small insert requests.
- Email sending and database saving are mixed together.

Saving to DB and sending email should not happen as one blocking process. First, the notification should be saved reliably. After that, email and app notification can be processed separately using background jobs.

### Better Flow

```text
function notify_all(student_ids, message):
  notification_id = save_notification(message)

  for batch in split(student_ids, 500):
    save_student_notifications(notification_id, batch)
    add_email_job(notification_id, batch)
    add_app_notification_job(notification_id, batch)

  return "notification queued successfully"
```

### Email Worker

```text
function email_worker(job):
  for student_id in job.student_ids:
    try:
      send_email(student_id, job.message)
      mark_email_sent(student_id, job.notification_id)
    catch error:
      retry_later(student_id, job.notification_id)
```

### App Notification Worker

```text
function app_notification_worker(job):
  for student_id in job.student_ids:
    push_to_app(student_id, job.message)
```

### Why This Is Better

- Database insert can be done in batches.
- Email failure will not stop DB saving.
- Failed emails can be retried.
- App notifications and emails can run in parallel.
- The user gets a quick response that the notification has been queued.

## Stage 6

For priority inbox, unread notifications should be shown based on importance and latest time. I used this priority order:

```text
Placement > Result > Event
```

If two notifications have the same type priority, the latest notification should come first.

The backend fetches notifications from:

```http
GET http://20.207.122.201/evaluation-service/notifications
```

Then it sorts the notifications and returns only the top `n`.

API created:

```http
GET /priority-notifications?limit=10
```

Run command:

```powershell
$env:LOG_ACCESS_TOKEN="paste_access_token_here"
npm run start:notifications
```

Postman URL:

```text
GET http://localhost:3002/priority-notifications?limit=10
```

To keep top notifications efficient, the system should not scan everything again and again in a real database. It can keep indexes on notification type and timestamp. For more scale, the top unread notification list can also be cached for each student and updated when a new notification comes or when one is marked as read.
