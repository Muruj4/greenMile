"""
tests/test_manager_model.py

Full test suite for ManagerDB model.
Relies on the shared engine/db_session fixtures in conftest.py.
"""

import pytest
from sqlalchemy.exc import IntegrityError

from models.manager_db import ManagerDB
from models.company_db import CompanyDB



# Helpers

def _company(name="TestCo"):
    return CompanyDB(name=name)

def _manager(n=1, company_id=1, **overrides):
    """Create a valid ManagerDB instance. Override any field via kwargs."""
    defaults = dict(
        full_name     = f"Manager {n}",
        email         = f"manager{n}@test.com",
        password_hash = "hashed_password",
        company_id    = company_id,
    )
    defaults.update(overrides)
    return ManagerDB(**defaults)

def _persisted_company(db_session, name="TestCo"):
    co = _company(name)
    db_session.add(co)
    db_session.commit()
    return co



#  MODEL STRUCTURE TESTS


class TestModelStructure:
    """Verify table name, columns, constraints, and relationships."""

    def test_table_name(self):
        assert ManagerDB.__tablename__ == "managers"

    def test_id_is_primary_key(self):
        assert ManagerDB.__table__.c["id"].primary_key is True

    def test_id_is_indexed(self):
        assert ManagerDB.__table__.c["id"].index is True

    def test_full_name_exists(self):
        assert "full_name" in ManagerDB.__table__.c

    def test_full_name_not_nullable(self):
        assert ManagerDB.__table__.c["full_name"].nullable is False

    def test_email_exists(self):
        assert "email" in ManagerDB.__table__.c

    def test_email_is_unique(self):
        assert ManagerDB.__table__.c["email"].unique is True

    def test_email_is_indexed(self):
        assert ManagerDB.__table__.c["email"].index is True

    def test_email_not_nullable(self):
        assert ManagerDB.__table__.c["email"].nullable is False

    def test_password_hash_exists(self):
        assert "password_hash" in ManagerDB.__table__.c

    def test_password_hash_not_nullable(self):
        assert ManagerDB.__table__.c["password_hash"].nullable is False

    def test_company_id_exists(self):
        assert "company_id" in ManagerDB.__table__.c

    def test_company_id_not_nullable(self):
        assert ManagerDB.__table__.c["company_id"].nullable is False

    def test_company_relationship_declared(self):
        assert hasattr(ManagerDB, "company")

    def test_no_trips_relationship(self):
        """ManagerDB should NOT have a trips relationship (unlike DriverDB)."""
        assert not hasattr(ManagerDB, "trips")

    def test_table_exists_in_db(self, engine):
        from sqlalchemy import inspect
        assert "managers" in inspect(engine).get_table_names()

    def test_all_columns_exist_in_db(self, engine):
        from sqlalchemy import inspect
        cols = [c["name"] for c in inspect(engine).get_columns("managers")]
        for expected in ("id", "full_name", "email", "password_hash", "company_id"):
            assert expected in cols



# CREATE TESTS


class TestCreate:

    def test_create_valid_manager(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        assert manager.id is not None

    def test_created_manager_fields_correct(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        assert manager.full_name     == "Manager 1"
        assert manager.email         == "manager1@test.com"
        assert manager.password_hash == "hashed_password"
        assert manager.company_id    == co.id

    def test_multiple_managers_get_unique_ids(self, db_session):
        co = _persisted_company(db_session)
        m1 = _manager(1, co.id)
        m2 = _manager(2, co.id)
        db_session.add_all([m1, m2])
        db_session.commit()
        assert m1.id != m2.id

    def test_duplicate_email_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_manager(1, co.id, email="same@test.com"))
        db_session.commit()
        db_session.add(_manager(2, co.id, email="same@test.com"))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_full_name_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_manager(1, co.id, full_name=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_email_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_manager(1, co.id, email=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_password_hash_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_manager(1, co.id, password_hash=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_company_id_raises(self, db_session):
        db_session.add(_manager(1, company_id=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_invalid_company_id_raises(self, db_session):
        """FK constraint: company must exist."""
        db_session.add(_manager(1, company_id=99999))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_two_managers_same_company(self, db_session):
        co = _persisted_company(db_session)
        db_session.add_all([_manager(1, co.id), _manager(2, co.id)])
        db_session.commit()
        count = db_session.query(ManagerDB).filter_by(company_id=co.id).count()
        assert count == 2

    def test_manager_email_driver_email_can_be_same(self, db_session):
        """ManagerDB and DriverDB have separate email unique constraints —
        the same email address is allowed in both tables simultaneously."""
        from models.driver_db import DriverDB
        co = _persisted_company(db_session)
        db_session.add(_manager(1, co.id, email="shared@test.com"))
        db_session.add(DriverDB(
            full_name="Driver 1",
            email="shared@test.com",
            password_hash="hash",
            company_id=co.id,
        ))
        db_session.commit()  # should NOT raise



# READ TESTS


class TestRead:

    def test_read_by_id(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        fetched = db_session.get(ManagerDB, manager.id)
        assert fetched is not None
        assert fetched.email == "manager1@test.com"

    def test_read_nonexistent_returns_none(self, db_session):
        assert db_session.get(ManagerDB, 99999) is None

    def test_read_by_email(self, db_session):
        co = _persisted_company(db_session)
        db_session.add(_manager(1, co.id, email="find@test.com"))
        db_session.commit()
        result = db_session.query(ManagerDB).filter_by(email="find@test.com").first()
        assert result is not None

    def test_read_by_company_id(self, db_session):
        co = _persisted_company(db_session)
        db_session.add_all([_manager(1, co.id), _manager(2, co.id)])
        db_session.commit()
        results = db_session.query(ManagerDB).filter_by(company_id=co.id).all()
        assert len(results) == 2

    def test_read_wrong_email_returns_none(self, db_session):
        result = db_session.query(ManagerDB).filter_by(email="ghost@test.com").first()
        assert result is None

    def test_read_all_managers(self, db_session):
        co = _persisted_company(db_session)
        for i in range(3):
            db_session.add(_manager(i, co.id))
        db_session.commit()
        assert db_session.query(ManagerDB).count() == 3



# UPDATE TESTS


class TestUpdate:

    def test_update_full_name(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        manager.full_name = "Updated Name"
        db_session.commit()
        assert db_session.get(ManagerDB, manager.id).full_name == "Updated Name"

    def test_update_email(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        manager.email = "new@test.com"
        db_session.commit()
        assert db_session.get(ManagerDB, manager.id).email == "new@test.com"

    def test_update_password_hash(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        manager.password_hash = "new_hash"
        db_session.commit()
        assert db_session.get(ManagerDB, manager.id).password_hash == "new_hash"

    def test_update_to_duplicate_email_raises(self, db_session):
        co = _persisted_company(db_session)
        db_session.add_all([
            _manager(1, co.id, email="a@test.com"),
            _manager(2, co.id, email="b@test.com"),
        ])
        db_session.commit()
        m2 = db_session.query(ManagerDB).filter_by(email="b@test.com").first()
        m2.email = "a@test.com"
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_update_does_not_change_id(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        original_id = manager.id
        manager.full_name = "Changed"
        db_session.commit()
        assert manager.id == original_id

    def test_reassign_manager_to_different_company(self, db_session):
        co1 = _persisted_company(db_session, "CoA")
        co2 = _persisted_company(db_session, "CoB")
        manager = _manager(1, co1.id)
        db_session.add(manager)
        db_session.commit()
        manager.company_id = co2.id
        db_session.commit()
        assert db_session.get(ManagerDB, manager.id).company_id == co2.id



# DELETE TESTS


class TestDelete:

    def test_delete_manager(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        mid = manager.id
        db_session.delete(manager)
        db_session.commit()
        assert db_session.get(ManagerDB, mid) is None

    def test_delete_only_targets_specific_manager(self, db_session):
        co = _persisted_company(db_session)
        m1 = _manager(1, co.id)
        m2 = _manager(2, co.id)
        db_session.add_all([m1, m2])
        db_session.commit()
        db_session.delete(m2)
        db_session.commit()
        assert db_session.get(ManagerDB, m1.id) is not None
        assert db_session.get(ManagerDB, m2.id) is None

    def test_delete_all_managers(self, db_session):
        co = _persisted_company(db_session)
        db_session.add_all([_manager(1, co.id), _manager(2, co.id)])
        db_session.commit()
        db_session.query(ManagerDB).delete()
        db_session.commit()
        assert db_session.query(ManagerDB).count() == 0

    def test_deleting_company_cascades_to_managers(self, db_session):
        """Cascade delete or FK violation — both are valid depending on config."""
        co = _persisted_company(db_session, "CascadeCo")
        db_session.add(_manager(1, co.id))
        db_session.commit()
        mid = db_session.query(ManagerDB).filter_by(company_id=co.id).first().id
        try:
            db_session.delete(co)
            db_session.commit()
            assert db_session.get(ManagerDB, mid) is None
        except IntegrityError:
            db_session.rollback()

    def test_delete_manager_does_not_delete_company(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        cid = co.id
        db_session.delete(manager)
        db_session.commit()
        assert db_session.get(CompanyDB, cid) is not None



# RELATIONSHIP TESTS


class TestRelationships:

    def test_manager_linked_to_company(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        db_session.refresh(manager)
        assert manager.company is not None
        assert manager.company.id == co.id

    def test_manager_company_name_correct(self, db_session):
        co = _persisted_company(db_session, "LinkCo")
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        db_session.refresh(manager)
        assert manager.company.name == "LinkCo"

    def test_manager_appears_in_company_managers_list(self, db_session):
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        db_session.refresh(co)
        assert manager in co.managers

    def test_manager_not_in_wrong_company(self, db_session):
        co1 = _persisted_company(db_session, "CoA")
        co2 = _persisted_company(db_session, "CoB")
        manager = _manager(1, co1.id)
        db_session.add(manager)
        db_session.commit()
        db_session.refresh(co2)
        assert manager not in co2.managers

    def test_multiple_managers_same_company(self, db_session):
        co = _persisted_company(db_session)
        for i in range(4):
            db_session.add(_manager(i, co.id))
        db_session.commit()
        db_session.refresh(co)
        assert len(co.managers) == 4

    def test_managers_from_different_companies_isolated(self, db_session):
        co1 = _persisted_company(db_session, "Iso1")
        co2 = _persisted_company(db_session, "Iso2")
        for i in range(3):
            db_session.add(_manager(i,    co1.id))
            db_session.add(_manager(i+10, co2.id))
        db_session.commit()
        db_session.refresh(co1)
        db_session.refresh(co2)
        assert len(co1.managers) == 3
        assert len(co2.managers) == 3

    def test_manager_does_not_appear_in_drivers_list(self, db_session):
        """Managers and drivers are separate relationships on CompanyDB."""
        co = _persisted_company(db_session)
        manager = _manager(1, co.id)
        db_session.add(manager)
        db_session.commit()
        db_session.refresh(co)
        assert manager not in co.drivers