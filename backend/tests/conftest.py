import pytest
import sys
import os
import json

# ── sys.path setup (unchanged from your original) ─────────────────────────
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)


# ===========================================================================
# STEP 1 — Patch JSONB → SQLite-compatible Text BEFORE importing any models
# ---------------------------------------------------------------------------
# TripDB uses `from sqlalchemy.dialects.postgresql import JSONB`.
# JSONB is PostgreSQL-only and crashes on SQLite's create_all().
# We replace it with a TypeDecorator that serialises JSON as TEXT,
# which works identically for tests but on any database engine.
# This patch MUST happen before any model file is imported.
# ===========================================================================

from sqlalchemy import Text, types

class _JSONBCompat(types.TypeDecorator):
    """SQLite-compatible JSONB substitute (stores as JSON text)."""
    impl        = Text
    cache_ok    = True

    def process_bind_param(self, value, dialect):
        return json.dumps(value) if value is not None else None

    def process_result_value(self, value, dialect):
        return json.loads(value) if value is not None else None

import sqlalchemy.dialects.postgresql as _pg
_pg.JSONB = _JSONBCompat          # patch the name BEFORE model files import it


# ===========================================================================
# STEP 2 — Import ALL models so SQLAlchemy's registry is fully populated
# ---------------------------------------------------------------------------
# Every model referenced by a relationship() string must be registered.
# Import order here matches the FK dependency chain:
#   CompanyDB  →  ManagerDB / DriverDB  →  TripDB
# ===========================================================================

from db.base          import Base
from models.company_db import CompanyDB   # noqa: F401
from models.manager_db import ManagerDB   # noqa: F401
from models.driver_db  import DriverDB    # noqa: F401
from models.trip_db    import TripDB      # noqa: F401  — needs JSONB patch above


# ===========================================================================
# STEP 3 — SQLAlchemy fixtures
# ===========================================================================

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def engine():
    """
    In-memory SQLite engine shared across the whole test session.
    JSONB is patched so TripDB.coordinates works without PostgreSQL.
    """
    from sqlalchemy import event

    _engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        echo=False,
    )

    # SQLite does NOT enforce FK constraints by default.
    # This event fires PRAGMA foreign_keys = ON for every new connection,
    # making SQLite behave like PostgreSQL for FK violation tests.
    @event.listens_for(_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(_engine)
    yield _engine
    Base.metadata.drop_all(_engine)
    _engine.dispose()


@pytest.fixture(scope="function")
def db_session(engine):
    """
    Isolated session per test — every change is rolled back after the test,
    so tests never pollute each other.
    """
    connection  = engine.connect()
    transaction = connection.begin()
    session     = sessionmaker(bind=connection)()
    yield session
    session.close()
    try:
        transaction.rollback()
    except Exception:
        pass  # already rolled back by SQLAlchemy after IntegrityError
    connection.close()


# ===========================================================================
# Your existing fixtures (completely unchanged)
# ===========================================================================

@pytest.fixture
def client():
    from backend.main import app
    return TestClient(app)


@pytest.fixture
def sample_route_coords():
    return [
        {"latitude": 24.7136, "longitude": 46.6753},
        {"latitude": 24.7150, "longitude": 46.6800},
        {"latitude": 24.7200, "longitude": 46.6850},
    ]


@pytest.fixture
def sample_trip_data():
    return {
        "origin":      "King Khalid International Airport",
        "destination": "Kingdom Centre",
        "city":        "Riyadh",
        "vehicleType": "Car",
        "fuelType":    "Petrol",
        "modelYear":   2020,
    }


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')")
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "unit: marks tests as unit tests")


@pytest.fixture(autouse=True)
def reset_navigation_state():
    yield


@pytest.fixture
def mock_env_vars(monkeypatch):
    def _set_env_vars(env_dict):
        for key, value in env_dict.items():
            monkeypatch.setenv(key, value)
    return _set_env_vars