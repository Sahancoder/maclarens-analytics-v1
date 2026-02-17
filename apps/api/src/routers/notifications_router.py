"""
Notifications Router

CRUD-style endpoints for in-app notifications.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Notification, User
from src.security.middleware import get_current_active_user, get_db

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationItemResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: List[NotificationItemResponse]
    total: int
    unread_count: int


class NotificationActionResponse(BaseModel):
    success: bool
    message: str


def _to_response_item(notification: Notification) -> NotificationItemResponse:
    return NotificationItemResponse(
        id=str(notification.id),
        type=notification.type or "system",
        title=notification.title or "Notification",
        message=notification.message or "",
        link=notification.link,
        is_read=bool(notification.is_read),
        created_at=notification.created_at,
    )


@router.get("", response_model=NotificationListResponse)
async def get_my_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=500),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get notifications for the authenticated user."""
    user_id = str(user.id)

    items_query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        items_query = items_query.where(Notification.is_read.is_(False))
    items_query = items_query.order_by(Notification.created_at.desc()).limit(limit)

    items_result = await db.execute(items_query)
    items = items_result.scalars().all()

    total_result = await db.execute(
        select(func.count(Notification.id)).where(Notification.user_id == user_id)
    )
    total = int(total_result.scalar_one() or 0)

    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    unread_count = int(unread_result.scalar_one() or 0)

    return NotificationListResponse(
        items=[_to_response_item(n) for n in items],
        total=total,
        unread_count=unread_count,
    )


@router.patch("/{notification_id}/read", response_model=NotificationActionResponse)
async def mark_notification_as_read(
    notification_id: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == str(user.id),
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = True
    await db.commit()

    return NotificationActionResponse(
        success=True,
        message="Notification marked as read",
    )


@router.patch("/read-all", response_model=NotificationActionResponse)
async def mark_all_notifications_as_read(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for authenticated user."""
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == str(user.id),
            Notification.is_read.is_(False),
        )
    )
    notifications = result.scalars().all()
    for notification in notifications:
        notification.is_read = True

    await db.commit()

    return NotificationActionResponse(
        success=True,
        message=f"Marked {len(notifications)} notification(s) as read",
    )


@router.delete("/{notification_id}", response_model=NotificationActionResponse)
async def delete_notification(
    notification_id: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete one notification owned by authenticated user."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == str(user.id),
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    await db.delete(notification)
    await db.commit()

    return NotificationActionResponse(
        success=True,
        message="Notification deleted",
    )
