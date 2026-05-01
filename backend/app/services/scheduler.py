from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.db.session import SessionLocal
from app.models.control import Control
from app.models.review_schedule import ReviewSchedule
from app.models.settings import Setting
from app.core.logging import logger


scheduler = BackgroundScheduler()


def review_reminder_job():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        setting = db.query(Setting).filter(Setting.key == "review_reminder_days").first()
        days = int(setting.value) if setting and setting.value else 7
        upcoming = db.query(ReviewSchedule).filter(
            ReviewSchedule.next_review_at <= now + timedelta(days=days),
            ReviewSchedule.next_review_at >= now,
        ).all()
        for sched in upcoming:
            logger.info(
                "review_reminder",
                control_id=sched.control_id,
                next_review=sched.next_review_at.isoformat(),
                reminder_days=days,
            )
    finally:
        db.close()


def init_scheduler(enabled: bool = True):
    if not enabled:
        return
    scheduler.add_job(
        review_reminder_job,
        trigger=CronTrigger(hour=9, minute=0),
        id="review_reminder",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("scheduler_started")


def shutdown_scheduler():
    scheduler.shutdown()
