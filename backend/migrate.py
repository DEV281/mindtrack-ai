#!/usr/bin/env python3
"""
MindTrack AI — Database Migration Script
=========================================
Adds all new columns and tables introduced in the 8-change redesign.
Safe to run multiple times (idempotent — uses IF NOT EXISTS / IF NOT EXISTS checks).

Usage:
    python migrate.py              # Uses default DATABASE_URL from .env or config
    DATABASE_URL_SYNC=... python migrate.py   # Override connection string

Supports SQLite (development) and PostgreSQL (production).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# ── Detect database URL ────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL_SYNC", "")

if not DATABASE_URL:
    # Try loading from .env
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("DATABASE_URL_SYNC="):
                DATABASE_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

    # Fall back to config default
    if not DATABASE_URL:
        DATABASE_URL = "postgresql://mindtrack:mindtrack_pass@localhost:5432/mindtrack"


def is_sqlite(url: str) -> bool:
    return "sqlite" in url.lower()


# ── PostgreSQL migration (production) ──────────────────────────────────────

PG_ALTER_USERS = """
-- Terms & Conditions (Change #4)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tnc_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tnc_accepted_at TIMESTAMPTZ;

-- Personal Details / Onboarding (Change #5)
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS concerns JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wellness_baseline INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sleep_quality VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS anxious_time VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(30) DEFAULT 'English';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_daily BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_weekly BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_sessions BOOLEAN DEFAULT FALSE;

-- Complexity Assessment (Change #7)
ALTER TABLE users ADD COLUMN IF NOT EXISTS complexity_profile VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS complexity_score INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS complexity_completed_at TIMESTAMPTZ;
"""

PG_ALTER_CONSULTATION_MESSAGES = """
-- Chat Media (Change #8)
ALTER TABLE consultation_messages ADD COLUMN IF NOT EXISTS voice_transcript TEXT;
ALTER TABLE consultation_messages ADD COLUMN IF NOT EXISTS input_method VARCHAR(10) DEFAULT 'text';
ALTER TABLE consultation_messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Voice State (Change #7 - Calm Redesign)
ALTER TABLE consultation_messages ADD COLUMN IF NOT EXISTS voice_state TEXT;
ALTER TABLE consultation_messages ADD COLUMN IF NOT EXISTS speech_confidence FLOAT;
ALTER TABLE consultation_messages ADD COLUMN IF NOT EXISTS was_voice_corrected BOOLEAN DEFAULT FALSE;
"""

PG_ALTER_REPORTS = """
-- Phase 3: Support consultation-based reports
ALTER TABLE reports ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS consultation_id VARCHAR REFERENCES consultations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS ix_reports_consultation_id ON reports(consultation_id);
"""

PG_CREATE_ACTIVITY_MOOD_LOGS = """
CREATE TABLE IF NOT EXISTS activity_mood_logs (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    before_mood INTEGER,
    after_mood INTEGER,
    duration_seconds INTEGER,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_activity_mood_logs_user_id ON activity_mood_logs(user_id);
"""

PG_CREATE_GRATITUDE_ENTRIES = """
CREATE TABLE IF NOT EXISTS gratitude_entries (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_gratitude_entries_user_id ON gratitude_entries(user_id);
"""


def migrate_postgres(url: str) -> None:
    """Run PostgreSQL migration using psycopg2."""
    try:
        import psycopg2
    except ImportError:
        print("❌ psycopg2 not installed. Trying psycopg2-binary...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
            import psycopg2
        except Exception as e:
            print(f"❌ Could not install psycopg2: {e}")
            print("   Run: pip install psycopg2-binary")
            sys.exit(1)

    print(f"🔗 Connecting to: {url.split('@')[-1] if '@' in url else url}")

    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()

    steps = [
        ("Adding new columns to 'users' table", PG_ALTER_USERS),
        ("Adding new columns to 'consultation_messages' table", PG_ALTER_CONSULTATION_MESSAGES),
        ("Updating 'reports' table for consultation support", PG_ALTER_REPORTS),
        ("Creating 'activity_mood_logs' table", PG_CREATE_ACTIVITY_MOOD_LOGS),
        ("Creating 'gratitude_entries' table", PG_CREATE_GRATITUDE_ENTRIES),
    ]

    for label, sql in steps:
        print(f"  ⏳ {label}...")
        try:
            cur.execute(sql)
            print(f"  ✅ {label} — done")
        except Exception as e:
            print(f"  ⚠️  {label} — {e}")

    # Verify: list all columns in users table
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' ORDER BY ordinal_position;
    """)
    cols = [row[0] for row in cur.fetchall()]
    new_cols = [
        'tnc_accepted', 'date_of_birth', 'gender', 'occupation', 'concerns',
        'wellness_baseline', 'sleep_quality', 'anxious_time', 'preferred_name',
        'onboarding_completed', 'complexity_profile', 'complexity_score',
    ]
    missing = [c for c in new_cols if c not in cols]

    if missing:
        print(f"\n⚠️  Missing columns in 'users': {missing}")
    else:
        print(f"\n✅ All {len(new_cols)} new user columns verified")

    # Verify new tables exist
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('activity_mood_logs', 'gratitude_entries');
    """)
    tables = [row[0] for row in cur.fetchall()]
    if len(tables) == 2:
        print("✅ Both new tables (activity_mood_logs, gratitude_entries) created")
    else:
        print(f"⚠️  New tables found: {tables}")

    cur.close()
    conn.close()
    print("\n🎉 Migration complete!")


# ── SQLite migration (development fallback) ────────────────────────────────

SQLITE_COLUMNS_USERS = [
    ("tnc_accepted", "BOOLEAN DEFAULT 0"),
    ("tnc_accepted_at", "TEXT"),
    ("date_of_birth", "TEXT"),
    ("gender", "TEXT"),
    ("occupation", "TEXT"),
    ("concerns", "TEXT"),  # JSON stored as text
    ("wellness_baseline", "INTEGER"),
    ("sleep_quality", "TEXT"),
    ("anxious_time", "TEXT"),
    ("preferred_name", "TEXT"),
    ("profile_photo_url", "TEXT"),
    ("preferred_language", "TEXT DEFAULT 'English'"),
    ("onboarding_completed", "BOOLEAN DEFAULT 0"),
    ("onboarding_skipped", "BOOLEAN DEFAULT 0"),
    ("notification_daily", "BOOLEAN DEFAULT 1"),
    ("notification_weekly", "BOOLEAN DEFAULT 1"),
    ("notification_sessions", "BOOLEAN DEFAULT 0"),
    ("complexity_profile", "TEXT"),
    ("complexity_score", "INTEGER"),
    ("complexity_completed_at", "TEXT"),
]

SQLITE_COLUMNS_MESSAGES = [
    ("voice_transcript", "TEXT"),
    ("input_method", "TEXT DEFAULT 'text'"),
    ("image_url", "TEXT"),
    ("voice_state", "TEXT"),
    ("speech_confidence", "REAL"),
    ("was_voice_corrected", "BOOLEAN DEFAULT 0"),
]


def migrate_sqlite(url: str) -> None:
    """Run SQLite migration."""
    import sqlite3

    db_path = url.replace("sqlite:///", "").replace("sqlite://", "")
    if not db_path or db_path == ":memory:":
        print("⚠️  In-memory SQLite — migration not needed (tables are created fresh)")
        return

    print(f"🔗 SQLite database: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    def get_columns(table: str) -> set:
        cur.execute(f"PRAGMA table_info({table})")
        return {row[1] for row in cur.fetchall()}

    # Users table
    existing = get_columns("users")
    for col_name, col_type in SQLITE_COLUMNS_USERS:
        if col_name not in existing:
            try:
                cur.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"  ✅ users.{col_name} added")
            except Exception as e:
                print(f"  ⚠️  users.{col_name} — {e}")

    # Consultation messages
    existing_msgs = get_columns("consultation_messages")
    for col_name, col_type in SQLITE_COLUMNS_MESSAGES:
        if col_name not in existing_msgs:
            try:
                cur.execute(f"ALTER TABLE consultation_messages ADD COLUMN {col_name} {col_type}")
                print(f"  ✅ consultation_messages.{col_name} added")
            except Exception as e:
                print(f"  ⚠️  consultation_messages.{col_name} — {e}")

    # New tables
    cur.execute("""
        CREATE TABLE IF NOT EXISTS activity_mood_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            activity_type TEXT NOT NULL,
            before_mood INTEGER,
            after_mood INTEGER,
            duration_seconds INTEGER,
            completed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS gratitude_entries (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  ✅ activity_mood_logs and gratitude_entries tables ready")

    # Reports table: add consultation_id
    existing_reports = get_columns("reports")
    if "consultation_id" not in existing_reports:
        try:
            cur.execute("ALTER TABLE reports ADD COLUMN consultation_id TEXT REFERENCES consultations(id) ON DELETE CASCADE")
            print("  ✅ reports.consultation_id added")
        except Exception as e:
            print(f"  ⚠️  reports.consultation_id — {e}")

    conn.commit()
    conn.close()
    print("\n🎉 SQLite migration complete!")


# ── Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 60)
    print("  MindTrack AI — Database Migration")
    print("=" * 60)
    print()

    if is_sqlite(DATABASE_URL):
        migrate_sqlite(DATABASE_URL)
    else:
        migrate_postgres(DATABASE_URL)


if __name__ == "__main__":
    main()
