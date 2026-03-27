
import pytest
from sqlalchemy.exc import IntegrityError

from models.driver_db import DriverDB
from models.company_db import CompanyDB
from models.trip_db import TripDB



# Helpers

def _company(name="TestCo"):
    return CompanyDB(name=name)

def _driver(n=1, company_id=1, **overrides):
    """Create a valid DriverDB instance. Override any field via kwargs."""
    defaults = dict(
        full_name     = f"Driver {n}",
        email         = f"driver{n}@test.com",
        password_hash = "hashed_password",
        company_id    = company_id,
    )
    defaults.update(overrides)
    return DriverDB(**defaults)

def _persisted_company(db_session, name="TestCo"):
    """Add a company to the session and return it with a real id."""
    co = _company(name)
    db_session.add(co)
    db_session.commit()
    return co



# MODEL STRUCTURE TESTS

class TestModelStructure:
    """Verify table name, columns, constraints, and relationships are correct."""

    def test_table_name(self):
        assert DriverDB.__tablename__ == "drivers"

    def test_id_is_primary_key(self):
        assert DriverDB.__table__.c["id"].primary_key is True

    def test_id_is_indexed(self):
        assert DriverDB.__table__.c["id"].index is True

    def test_full_name_exists(self):
        assert "full_name" in DriverDB.__table__.c

    def test_full_name_not_nullable(self):
        assert DriverDB.__table__.c["full_name"].nullable is False

    def test_email_exists(self):
        assert "email" in DriverDB.__table__.c

    def test_email_is_unique(self):
        assert DriverDB.__table__.c["email"].unique is True

    def test_email_is_indexed(self):
        assert DriverDB.__table__.c["email"].index is True

    def test_email_not_nullable(self):
        assert DriverDB.__table__.c["email"].nullable is False

    def test_password_hash_exists(self):
        assert "password_hash" in DriverDB.__table__.c

    def test_password_hash_not_nullable(self):
        assert DriverDB.__table__.c["password_hash"].nullable is False

    def test_company_id_exists(self):
        assert "company_id" in DriverDB.__table__.c

    def test_company_id_not_nullable(self):
        assert DriverDB.__table__.c["company_id"].nullable is False

    def test_company_relationship_declared(self):
        assert hasattr(DriverDB, "company")

    def test_trips_relationship_declared(self):
        assert hasattr(DriverDB, "trips")

    def test_table_exists_in_db(self, engine):
        from sqlalchemy import inspect
        assert "drivers" in inspect(engine).get_table_names()

    def test_all_columns_exist_in_db(self, engine):
        from sqlalchemy import inspect
        cols = [c["name"] for c in inspect(engine).get_columns("drivers")]
        for expected in ("id", "full_name", "email", "password_hash", "company_id"):
            assert expected in cols



# CREATE TESTS


class TestCreate:
    """Test inserting drivers into the database."""

    def test_create_valid_driver(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        assert driver.id is not None

    def test_created_driver_fields_correct(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        assert driver.full_name     == "Driver 1"
        assert driver.email         == "driver1@test.com"
        assert driver.password_hash == "hashed_password"
        assert driver.company_id    == co.id

    def test_multiple_drivers_get_unique_ids(self, db_session):
        co = _persisted_company(db_session)
        d1 = _driver(1, co.id)
        d2 = _driver(2, co.id)
        db_session.add_all([d1, d2])
        db_session.commit()
        assert d1.id != d2.id

    def test_duplicate_email_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_driver(1, co.id, email="same@test.com"))
        db_session.commit()
        db_session.add(_driver(2, co.id, email="same@test.com"))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_full_name_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_driver(1, co.id, full_name=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_email_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_driver(1, co.id, email=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_password_hash_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_driver(1, co.id, password_hash=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_company_id_raises(self, db_session):
        db_session.add(_driver(1, company_id=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_invalid_company_id_raises(self, db_session):
        """FK constraint: company must exist."""
        db_session.add(_driver(1, company_id=99999))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_two_drivers_same_company(self, db_session):
        co = _persisted_company(db_session)
        db_session.add_all([_driver(1, co.id), _driver(2, co.id)])
        db_session.commit()
        count = db_session.query(DriverDB).filter_by(company_id=co.id).count()
        assert count == 2


# READ TESTS


class TestRead:
    """Test querying drivers."""

    def test_read_by_id(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        fetched = db_session.get(DriverDB, driver.id)
        assert fetched is not None
        assert fetched.email == "driver1@test.com"

    def test_read_nonexistent_returns_none(self, db_session):
        assert db_session.get(DriverDB, 99999) is None

    def test_read_by_email(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_driver(1, co.id, email="unique@test.com"))
        db_session.commit()
        result = db_session.query(DriverDB).filter_by(email="unique@test.com").first()
        assert result is not None

    def test_read_by_company_id(self, db_session):
        co = _persisted_company(db_session)
        db_session.add_all([_driver(1, co.id), _driver(2, co.id)])
        db_session.commit()
        results = db_session.query(DriverDB).filter_by(company_id=co.id).all()
        assert len(results) == 2

    def test_read_wrong_email_returns_none(self, db_session):
        result = db_session.query(DriverDB).filter_by(email="ghost@test.com").first()
        assert result is None



# UPDATE TESTS


class TestUpdate:
    """Test modifying existing drivers."""

    def test_update_full_name(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        driver.full_name = "Updated Name"
        db_session.commit()
        assert db_session.get(DriverDB, driver.id).full_name == "Updated Name"

    def test_update_email(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        driver.email = "new@test.com"
        db_session.commit()
        assert db_session.get(DriverDB, driver.id).email == "new@test.com"

    def test_update_password_hash(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        driver.password_hash = "new_hash"
        db_session.commit()
        assert db_session.get(DriverDB, driver.id).password_hash == "new_hash"

    def test_update_to_duplicate_email_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add_all([
            _driver(1, co.id, email="a@test.com"),
            _driver(2, co.id, email="b@test.com"),
        ])
        db_session.commit()
        d2 = db_session.query(DriverDB).filter_by(email="b@test.com").first()
        d2.email = "a@test.com"
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_update_does_not_change_id(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        original_id = driver.id
        driver.full_name = "Changed"
        db_session.commit()
        assert driver.id == original_id



# DELETE TESTS


class TestDelete:
    """Test removing drivers."""

    def test_delete_driver(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        did = driver.id
        db_session.delete(driver)
        db_session.commit()
        assert db_session.get(DriverDB, did) is None

    def test_delete_only_targets_specific_driver(self, db_session):
        co = _persisted_company(db_session)
        d1 = _driver(1, co.id)
        d2 = _driver(2, co.id)
        db_session.add_all([d1, d2])
        db_session.commit()
        db_session.delete(d2)
        db_session.commit()
        assert db_session.get(DriverDB, d1.id) is not None
        assert db_session.get(DriverDB, d2.id) is None

    def test_delete_all_drivers(self, db_session):
        co = _persisted_company(db_session)
        db_session.add_all([_driver(1, co.id), _driver(2, co.id)])
        db_session.commit()
        db_session.query(DriverDB).delete()
        db_session.commit()
        assert db_session.query(DriverDB).count() == 0

    def test_deleting_company_cascades_to_drivers(self, db_session):
        """When a company is deleted, its drivers should be deleted too
        if cascade is set on the company side — or raise IntegrityError if not."""
        co = _persisted_company(db_session, name="CascadeCo")
        db_session.add(_driver(1, co.id))
        db_session.commit()
        did = db_session.query(DriverDB).filter_by(company_id=co.id).first().id
        try:
            db_session.delete(co)
            db_session.commit()
            # If cascade is configured: driver should be gone
            assert db_session.get(DriverDB, did) is None
        except IntegrityError:
            # If no cascade: FK violation is the correct behaviour
            db_session.rollback()



# RELATIONSHIP TESTS


class TestRelationships:
    """Test company and trips relationships."""

    def test_driver_linked_to_company(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        db_session.refresh(driver)
        assert driver.company is not None
        assert driver.company.id == co.id

    def test_driver_company_name_correct(self, db_session):
        co = _persisted_company(db_session, name="LinkCo")
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        db_session.refresh(driver)
        assert driver.company.name == "LinkCo"

    def test_driver_appears_in_company_drivers_list(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        db_session.refresh(co)
        assert driver in co.drivers

    def test_new_driver_has_empty_trips(self, db_session):
        co = _persisted_company(db_session)
        driver = _driver(1, co.id)
        db_session.add(driver)
        db_session.commit()
        assert driver.trips == []

    def test_driver_not_linked_to_wrong_company(self, db_session):
        co1 = _persisted_company(db_session, name="CoA")
        co2 = _persisted_company(db_session, name="CoB")
        driver = _driver(1, co1.id)
        db_session.add(driver)
        db_session.commit()
        db_session.refresh(co2)
        assert driver not in co2.drivers

    def test_multiple_drivers_same_company(self, db_session):
        co = _persisted_company(db_session)
        for i in range(4):
            db_session.add(_driver(i, co.id))
        db_session.commit()
        db_session.refresh(co)
        assert len(co.drivers) == 4

    def test_drivers_from_different_companies_isolated(self, db_session):
        co1 = _persisted_company(db_session, name="Iso1")
        co2 = _persisted_company(db_session, name="Iso2")
        for i in range(3):
            db_session.add(_driver(i,   co1.id))
            db_session.add(_driver(i+10, co2.id))
        db_session.commit()
        db_session.refresh(co1)
        db_session.refresh(co2)
        assert len(co1.drivers) == 3
        assert len(co2.drivers) == 3