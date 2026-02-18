import psycopg2
from psycopg2.extras import RealDictCursor
import streamlit as st
from datetime import date, datetime, time
import json
import os


def _json_default(value):
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    return str(value)


def _json_dumps(value):
    return json.dumps(value, default=_json_default) if value is not None else None

def _load_db_config_from_env():
    """Load DB config from environment variables.

    Prefer DATABASE_URL, otherwise fall back to individual vars.
    """
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return {"DATABASE_URL": database_url}

    host = os.environ.get("DB_HOST")
    dbname = os.environ.get("DB_NAME")
    user = os.environ.get("DB_USER")
    password = os.environ.get("DB_PASSWORD")
    port = os.environ.get("DB_PORT")
    if host and dbname and user and password:
        return {
            "host": host,
            "database": dbname,
            "user": user,
            "password": password,
            "port": int(port) if port else 5432,
        }

    return None


def _load_db_config_from_streamlit_secrets():
    """Load DB config from Streamlit secrets.

    Supports either:
    - st.secrets["DATABASE_URL"]
    - st.secrets["DB_CONFIG"] (mapping with host/database/user/password/port)
    """
    try:
        secrets = st.secrets
    except Exception:
        return None

    try:
        database_url = secrets.get("DATABASE_URL")
        if database_url:
            return {"DATABASE_URL": database_url}
        db_config = secrets.get("DB_CONFIG")
        if db_config:
            return dict(db_config)
    except Exception:
        return None

    return None


def get_db_config():
    """Get DB config from env/secrets.

    Returns either {"DATABASE_URL": ...} or a psycopg2 kwargs dict.
    """
    cfg = _load_db_config_from_env()
    if cfg:
        return cfg

    cfg = _load_db_config_from_streamlit_secrets()
    if cfg:
        return cfg

    # Safe local default (no secrets in repo)
    return {
        "host": "localhost",
        "database": "strong_fitness_studio_app",
        "user": "postgres",
        "password": "postgres",
        "port": 5432,
    }


def get_connection():
    """Get database connection"""
    try:
        cfg = get_db_config()
        if "DATABASE_URL" in cfg:
            conn = psycopg2.connect(cfg["DATABASE_URL"])
        else:
            conn = psycopg2.connect(**cfg)
        return conn
    except Exception as e:
        st.error(f"Database connection error: {e}")
        return None


def init_database():
    """Initialize database tables"""
    conn = get_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()

        # Athletes table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS athletes (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(20),
                birth_date DATE,
                gender VARCHAR(20),
                weight DECIMAL(5,2),
                height DECIMAL(5,2),
                fitness_level VARCHAR(50),
                goals TEXT,
                medical_conditions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Billing fields on athletes (added via ALTER TABLE for existing DBs)
        cur.execute("ALTER TABLE athletes ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'monthly'")
        cur.execute("ALTER TABLE athletes ADD COLUMN IF NOT EXISTS plan_sessions_per_week INTEGER")
        cur.execute("ALTER TABLE athletes ADD COLUMN IF NOT EXISTS plan_monthly_price DECIMAL(10,2)")
        cur.execute("ALTER TABLE athletes ADD COLUMN IF NOT EXISTS plan_on_demand_price DECIMAL(10,2)")

        # Exercises table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS exercises (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                category VARCHAR(100),
                muscle_groups TEXT,
                equipment TEXT,
                difficulty VARCHAR(50),
                description TEXT,
                instructions TEXT,
                video_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Training sessions table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS training_sessions (
                id SERIAL PRIMARY KEY,
                athlete_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
                session_name VARCHAR(200) NOT NULL,
                session_date DATE NOT NULL,
                session_time TIME NOT NULL,
                duration INTEGER,
                session_type VARCHAR(100),
                session_notes TEXT,
                status VARCHAR(50) DEFAULT 'Scheduled',
                exercises JSONB,
                completed_data JSONB,
                completed_at TIMESTAMP,
                created_date DATE DEFAULT CURRENT_DATE
            )
        """
        )

        # Evaluations table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluations (
                id SERIAL PRIMARY KEY,
                athlete_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
                evaluation_date DATE NOT NULL,
                weight DECIMAL(5,2),
                muscle_percentage DECIMAL(5,2),
                fat_percentage DECIMAL(5,2),
                bone_percentage DECIMAL(5,2),
                water_percentage DECIMAL(5,2),
                notes TEXT,
                created_date DATE DEFAULT CURRENT_DATE
            )
        """
        )

        # Payments summary (one row per athlete per month)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                athlete_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
                month DATE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                paid_amount DECIMAL(10,2),
                paid_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (athlete_id, month)
            )
        """
        )

        # Payment adjustments (credits/debits) applied to a month
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_adjustments (
                id SERIAL PRIMARY KEY,
                athlete_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
                applies_month DATE NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                reason TEXT,
                related_session_id INTEGER REFERENCES training_sessions(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        st.error(f"Error initializing database: {e}")
        conn.rollback()
        conn.close()
        return False


# Athletes CRUD
@st.cache_data(ttl=60)
def get_all_athletes():
    """Get all athletes"""
    conn = get_connection()
    if not conn:
        return []

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM athletes ORDER BY first_name, last_name")
        athletes = cur.fetchall()
        cur.close()
        conn.close()
        return athletes
    except Exception as e:
        st.error(f"Error fetching athletes: {e}")
        conn.close()
        return []


def add_athlete(athlete_data):
    """Add new athlete"""
    conn = get_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO athletes (first_name, last_name, email, phone, birth_date, 
                                gender, weight, height, fitness_level, goals, medical_conditions)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """,
            (
                athlete_data["first_name"],
                athlete_data["last_name"],
                athlete_data["email"],
                athlete_data["phone"],
                athlete_data["birth_date"],
                athlete_data["gender"],
                athlete_data["weight"],
                athlete_data["height"],
                athlete_data["fitness_level"],
                athlete_data["goals"],
                athlete_data["medical_conditions"],
            ),
        )
        athlete_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        get_all_athletes.clear()  # Clear cache
        return athlete_id
    except Exception as e:
        st.error(f"Error adding athlete: {e}")
        conn.rollback()
        conn.close()
        return False


def delete_athlete(athlete_id):
    """Delete athlete"""
    conn = get_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM athletes WHERE id = %s", (athlete_id,))
        conn.commit()
        cur.close()
        conn.close()
        get_all_athletes.clear()  # Clear cache
        return True
    except Exception as e:
        st.error(f"Error deleting athlete: {e}")
        conn.rollback()
        conn.close()
        return False


# Exercises CRUD
@st.cache_data(ttl=60)
def get_all_exercises():
    """Get all exercises"""
    conn = get_connection()
    if not conn:
        return []

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM exercises ORDER BY name")
        exercises = cur.fetchall()
        cur.close()
        conn.close()
        return exercises
    except Exception as e:
        st.error(f"Error fetching exercises: {e}")
        conn.close()
        return []


def add_exercise(exercise_data):
    """Add new exercise"""
    conn = get_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO exercises (name, category, muscle_groups, equipment, 
                                 difficulty, description, instructions, video_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """,
            (
                exercise_data["name"],
                exercise_data["category"],
                exercise_data["muscle_groups"],
                exercise_data["equipment"],
                exercise_data["difficulty"],
                exercise_data["description"],
                exercise_data["instructions"],
                exercise_data["video_url"],
            ),
        )
        exercise_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        get_all_exercises.clear()  # Clear cache
        return exercise_id
    except Exception as e:
        st.error(f"Error adding exercise: {e}")
        conn.rollback()
        conn.close()
        return False


def delete_exercise(exercise_id):
    """Delete exercise"""
    conn = get_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM exercises WHERE id = %s", (exercise_id,))
        conn.commit()
        cur.close()
        conn.close()
        get_all_exercises.clear()  # Clear cache
        return True
    except Exception as e:
        st.error(f"Error deleting exercise: {e}")
        conn.rollback()
        conn.close()
        return False


# Training Sessions CRUD
@st.cache_data(ttl=60)
def get_all_training_sessions():
    """Get all training sessions"""
    conn = get_connection()
    if not conn:
        return []

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT ts.*, a.first_name, a.last_name 
            FROM training_sessions ts
            JOIN athletes a ON ts.athlete_id = a.id
            ORDER BY ts.session_date DESC, ts.session_time DESC
        """
        )
        sessions = cur.fetchall()
        cur.close()
        conn.close()
        return sessions
    except Exception as e:
        st.error(f"Error fetching training sessions: {e}")
        conn.close()
        return []


def add_training_session(session_data):
    """Add new training session"""
    conn = get_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO training_sessions (athlete_id, session_name, session_date, 
                                         session_time, duration, session_type, 
                                         session_notes, exercises, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """,
            (
                session_data["athlete_id"],
                session_data["session_name"],
                session_data["session_date"],
                session_data["session_time"],
                session_data["duration"],
                session_data["session_type"],
                session_data["session_notes"],
                _json_dumps(session_data["exercises"]),
                session_data.get("status", "Scheduled"),
            ),
        )
        session_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        get_all_training_sessions.clear()  # Clear cache
        get_training_sessions_between.clear()  # Clear cache
        get_recent_completed_sessions.clear()  # Clear cache
        return session_id
    except Exception as e:
        st.error(f"Error adding training session: {e}")
        conn.rollback()
        conn.close()
        return False


@st.cache_data(ttl=60)
def get_training_sessions_between(start_date, end_date, athlete_id=None):
    """Get training sessions in a date range.

    Args:
        start_date: date or ISO date string
        end_date: date or ISO date string
        athlete_id: optional athlete id to filter
    """
    conn = get_connection()
    if not conn:
        return []

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if athlete_id is None:
            cur.execute(
                """
                SELECT ts.*, a.first_name, a.last_name
                FROM training_sessions ts
                JOIN athletes a ON ts.athlete_id = a.id
                WHERE ts.session_date BETWEEN %s AND %s
                ORDER BY ts.session_date ASC, ts.session_time ASC
                """,
                (start_date, end_date),
            )
        else:
            cur.execute(
                """
                SELECT ts.*, a.first_name, a.last_name
                FROM training_sessions ts
                JOIN athletes a ON ts.athlete_id = a.id
                WHERE ts.athlete_id = %s
                  AND ts.session_date BETWEEN %s AND %s
                ORDER BY ts.session_date ASC, ts.session_time ASC
                """,
                (athlete_id, start_date, end_date),
            )

        sessions = cur.fetchall()
        cur.close()
        conn.close()
        return sessions
    except Exception as e:
        st.error(f"Error fetching training sessions by range: {e}")
        conn.close()
        return []


def update_training_session(session_id, session_data):
    """Update training session.

    Supports partial updates: session_data may contain any subset of columns.
    """
    conn = get_connection()
    if not conn:
        return False

    try:
        if not isinstance(session_data, dict) or not session_data:
            return False

        allowed_columns = {
            "athlete_id": "athlete_id",
            "session_name": "session_name",
            "session_date": "session_date",
            "session_time": "session_time",
            "duration": "duration",
            "session_type": "session_type",
            "session_notes": "session_notes",
            "status": "status",
            "completed_at": "completed_at",
            "exercises": "exercises",
            "completed_data": "completed_data",
        }

        set_clauses = []
        values = []

        for key, col in allowed_columns.items():
            if key not in session_data:
                continue

            value = session_data.get(key)
            if key in ("exercises", "completed_data"):
                value = _json_dumps(value)
            set_clauses.append(f"{col} = %s")
            values.append(value)

        if not set_clauses:
            return False

        sql = f"UPDATE training_sessions SET {', '.join(set_clauses)} WHERE id = %s"
        values.append(session_id)

        cur = conn.cursor()
        cur.execute(sql, tuple(values))
        conn.commit()
        cur.close()
        conn.close()
        get_all_training_sessions.clear()  # Clear cache
        get_training_sessions_between.clear()  # Clear cache
        get_recent_completed_sessions.clear()  # Clear cache
        return True
    except Exception as e:
        st.error(f"Error updating training session: {e}")
        conn.rollback()
        conn.close()
        return False


def delete_training_session(session_id):
    """Delete training session"""
    conn = get_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM training_sessions WHERE id = %s", (session_id,))
        conn.commit()
        cur.close()
        conn.close()
        get_all_training_sessions.clear()  # Clear cache
        get_training_sessions_between.clear()  # Clear cache
        get_recent_completed_sessions.clear()  # Clear cache
        return True
    except Exception as e:
        st.error(f"Error deleting training session: {e}")
        conn.rollback()
        conn.close()
        return False


@st.cache_data(ttl=60)
def get_recent_completed_sessions(athlete_id, limit=50):
    """Get the most recent completed sessions for an athlete.

    Returns sessions ordered from newest to oldest.
    """
    conn = get_connection()
    if not conn:
        return []

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT id, athlete_id, session_name, session_date, session_time, exercises, completed_data
            FROM training_sessions
            WHERE athlete_id = %s
              AND status = 'Completed'
            ORDER BY session_date DESC, session_time DESC
            LIMIT %s
            """,
            (athlete_id, limit),
        )
        sessions = cur.fetchall()
        cur.close()
        conn.close()
        return sessions
    except Exception as e:
        st.error(f"Error fetching recent completed sessions: {e}")
        conn.close()
        return []


# Evaluations CRUD
@st.cache_data(ttl=60)
def get_all_evaluations():
    """Get all evaluations"""
    conn = get_connection()
    if not conn:
        return []

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT e.*, a.first_name, a.last_name 
            FROM evaluations e
            JOIN athletes a ON e.athlete_id = a.id
            ORDER BY e.evaluation_date DESC
        """
        )
        evaluations = cur.fetchall()
        cur.close()
        conn.close()
        return evaluations
    except Exception as e:
        st.error(f"Error fetching evaluations: {e}")
        conn.close()
        return []


def add_evaluation(evaluation_data):
    """Add new evaluation"""
    conn = get_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO evaluations (athlete_id, evaluation_date, weight, 
                                   muscle_percentage, fat_percentage, 
                                   bone_percentage, water_percentage, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """,
            (
                evaluation_data["athlete_id"],
                evaluation_data["evaluation_date"],
                evaluation_data["weight"],
                evaluation_data["muscle_percentage"],
                evaluation_data["fat_percentage"],
                evaluation_data["bone_percentage"],
                evaluation_data["water_percentage"],
                evaluation_data["notes"],
            ),
        )
        evaluation_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return evaluation_id
    except Exception as e:
        st.error(f"Error adding evaluation: {e}")
        conn.rollback()
        conn.close()
        return False


def delete_evaluation(evaluation_id):
    """Delete evaluation"""
    conn = get_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM evaluations WHERE id = %s", (evaluation_id,))
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        st.error(f"Error deleting evaluation: {e}")
        conn.rollback()
        conn.close()
        return False
