# Skill: Notifications + Email (Resend)

## Goal

DB-backed notifications with email delivery.

## Rules

- Create notification row first (source of truth)
- Then send email referencing that notification
- UI notifications page reads DB only

## Events -> recipients

- Actual submitted -> FD(s) assigned to company
- Actual rejected -> FO who created report
- Actual approved -> FO + optionally MD
- Budget submitted -> FD(s)
- Admin changes (optional) -> Admin only or audit only

## GraphQL operations

- notifications(unreadOnly)
- markNotificationRead(id)
- markAllNotificationsRead()

## Acceptance checks

- Notifications appear in UI immediately
- Emails send from donotreply domain
- Email content matches notification stored
