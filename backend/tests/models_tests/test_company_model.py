
import pytest
from sqlalchemy.exc import IntegrityError

from models.company_db import CompanyDB
from models.manager_db import ManagerDB
from models.driver_db import DriverDB


# MODEL STRUCTURE TESTS

class TestModelStructure:

    def test_table_name(self):
        assert CompanyDB.__tablename__ == "companies"

    def test_id_is_primary_key(self):
        col = CompanyDB.__table__.c["id"]
        assert col.primary_key is True

    def test_id_is_indexed(self):
        col = CompanyDB.__table__.c["id"]
        assert col.index is True

    def test_name_column_exists(self):
        assert "name" in CompanyDB.__table__.c

    def test_name_is_unique(self):
        col = CompanyDB.__table__.c["name"]
        assert col.unique is True

    def test_name_is_indexed(self):
        col = CompanyDB.__table__.c["name"]
        assert col.index is True

    def test_name_is_not_nullable(self):
        col = CompanyDB.__table__.c["name"]
        assert col.nullable is False

    def test_managers_relationship_declared(self):
        assert hasattr(CompanyDB, "managers")

    def test_drivers_relationship_declared(self):
        assert hasattr(CompanyDB, "drivers")

    def test_table_exists_in_db(self, engine):
        from sqlalchemy import inspect
        inspector = inspect(engine)
        assert "companies" in inspector.get_table_names()

    def test_db_columns_match_model(self, engine):
        from sqlalchemy import inspect
        inspector = inspect(engine)
        col_names = [c["name"] for c in inspector.get_columns("companies")]
        assert "id" in col_names
        assert "name" in col_names



# CREATE TESTS


class TestCreate:

    def test_create_valid_company(self, db_session):
        company = CompanyDB(name="Acme Corp")
        db_session.add(company)
        db_session.commit()
        assert company.id is not None

    def test_created_company_has_correct_name(self, db_session):
        company = CompanyDB(name="Globex")
        db_session.add(company)
        db_session.commit()
        assert company.name == "Globex"

    def test_multiple_companies_get_unique_ids(self, db_session):
        c1 = CompanyDB(name="Alpha Inc")
        c2 = CompanyDB(name="Beta LLC")
        db_session.add_all([c1, c2])
        db_session.commit()
        assert c1.id != c2.id

    def test_duplicate_name_raises_integrity_error(self, db_session):
        db_session.add(CompanyDB(name="DuplicateCo"))
        db_session.commit()
        db_session.add(CompanyDB(name="DuplicateCo"))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_name_raises_integrity_error(self, db_session):
        db_session.add(CompanyDB(name=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_empty_string_name_is_allowed(self, db_session):
        company = CompanyDB(name="")
        db_session.add(company)
        db_session.commit()
        assert company.id is not None

    def test_unicode_name_allowed(self, db_session):
        company = CompanyDB(name="会社名 GmbH & Cie")
        db_session.add(company)
        db_session.commit()
        assert company.id is not None

    def test_special_characters_in_name(self, db_session):
        company = CompanyDB(name="O'Brien & Partners! @#$%")
        db_session.add(company)
        db_session.commit()
        assert company.id is not None

    def test_very_long_name_allowed(self, db_session):
        company = CompanyDB(name="A" * 1000)
        db_session.add(company)
        db_session.commit()
        assert company.id is not None



# READ TESTS


class TestRead:

    def test_read_by_id(self, db_session):
        company = CompanyDB(name="ReadCo")
        db_session.add(company)
        db_session.commit()
        fetched = db_session.get(CompanyDB, company.id)
        assert fetched is not None
        assert fetched.name == "ReadCo"

    def test_read_nonexistent_id_returns_none(self, db_session):
        fetched = db_session.get(CompanyDB, 99999)
        assert fetched is None

    def test_read_by_name_filter(self, db_session):
        db_session.add(CompanyDB(name="FilterCo"))
        db_session.commit()
        result = db_session.query(CompanyDB).filter_by(name="FilterCo").first()
        assert result is not None
        assert result.name == "FilterCo"

    def test_read_all_companies(self, db_session):
        db_session.add_all([
            CompanyDB(name="Co1"),
            CompanyDB(name="Co2"),
            CompanyDB(name="Co3"),
        ])
        db_session.commit()
        results = db_session.query(CompanyDB).all()
        assert len(results) == 3

    def test_read_wrong_name_returns_none(self, db_session):
        db_session.add(CompanyDB(name="RealCo"))
        db_session.commit()
        result = db_session.query(CompanyDB).filter_by(name="FakeCo").first()
        assert result is None


# UPDATE TESTS

class TestUpdate:

    def test_update_name(self, db_session):
        company = CompanyDB(name="OldName")
        db_session.add(company)
        db_session.commit()
        company.name = "NewName"
        db_session.commit()
        fetched = db_session.get(CompanyDB, company.id)
        assert fetched.name == "NewName"

    def test_update_to_existing_name_raises(self, db_session):
        db_session.add_all([
            CompanyDB(name="NameA"),
            CompanyDB(name="NameB"),
        ])
        db_session.commit()
        company_b = db_session.query(CompanyDB).filter_by(name="NameB").first()
        company_b.name = "NameA"
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_update_does_not_change_id(self, db_session):
        company = CompanyDB(name="StableId")
        db_session.add(company)
        db_session.commit()
        original_id = company.id
        company.name = "UpdatedName"
        db_session.commit()
        assert company.id == original_id



# DELETE TESTS (من الداتا بيس)


class TestDelete:

    def test_delete_company(self, db_session):
        company = CompanyDB(name="DeleteMe")
        db_session.add(company)
        db_session.commit()
        cid = company.id
        db_session.delete(company)
        db_session.commit()
        assert db_session.get(CompanyDB, cid) is None

    def test_delete_only_targets_specific_company(self, db_session):
        c1 = CompanyDB(name="KeepMe")
        c2 = CompanyDB(name="RemoveMe")
        db_session.add_all([c1, c2])
        db_session.commit()
        db_session.delete(c2)
        db_session.commit()
        assert db_session.get(CompanyDB, c1.id) is not None
        assert db_session.get(CompanyDB, c2.id) is None

    def test_delete_all_companies(self, db_session):
        db_session.add_all([CompanyDB(name="X"), CompanyDB(name="Y")])
        db_session.commit()
        db_session.query(CompanyDB).delete()
        db_session.commit()
        assert db_session.query(CompanyDB).count() == 0


# RELATIONSHIP TESTS

def _make_manager(n, company_id):
    return ManagerDB(
        full_name=f"Manager {n}",
        email=f"manager{n}@test.com",
        password_hash="hashed",
        company_id=company_id,
    )

def _make_driver(n, company_id):
    return DriverDB(
        full_name=f"Driver {n}",
        email=f"driver{n}@test.com",
        password_hash="hashed",
        company_id=company_id,
    )


class TestRelationships:

    def test_new_company_has_empty_managers(self, db_session):
        company = CompanyDB(name="NoMgrCo")
        db_session.add(company)
        db_session.commit()
        assert company.managers == []

    def test_new_company_has_empty_drivers(self, db_session):
        company = CompanyDB(name="NoDrvCo")
        db_session.add(company)
        db_session.commit()
        assert company.drivers == []

    def test_add_manager_appears_in_company(self, db_session):
        company = CompanyDB(name="MgrCo")
        db_session.add(company)
        db_session.commit()
        db_session.add(_make_manager(1, company.id))
        db_session.commit()
        db_session.refresh(company)
        assert len(company.managers) == 1
        assert company.managers[0].full_name == "Manager 1"

    def test_add_driver_appears_in_company(self, db_session):
        company = CompanyDB(name="DrvCo")
        db_session.add(company)
        db_session.commit()
        db_session.add(_make_driver(1, company.id))
        db_session.commit()
        db_session.refresh(company)
        assert len(company.drivers) == 1
        assert company.drivers[0].full_name == "Driver 1"

    def test_manager_back_populates_company(self, db_session):
        company = CompanyDB(name="BackPopMgr")
        db_session.add(company)
        db_session.commit()
        manager = _make_manager(1, company.id)
        db_session.add(manager)
        db_session.commit()
        db_session.refresh(manager)
        assert manager.company.name == "BackPopMgr"

    def test_driver_back_populates_company(self, db_session):
        company = CompanyDB(name="BackPopDrv")
        db_session.add(company)
        db_session.commit()
        driver = _make_driver(1, company.id)
        db_session.add(driver)
        db_session.commit()
        db_session.refresh(driver)
        assert driver.company.name == "BackPopDrv"

    def test_multiple_managers_linked_to_company(self, db_session):
        company = CompanyDB(name="MultiMgr")
        db_session.add(company)
        db_session.commit()
        for i in range(5):
            db_session.add(_make_manager(i, company.id))
        db_session.commit()
        db_session.refresh(company)
        assert len(company.managers) == 5

    def test_multiple_drivers_linked_to_company(self, db_session):
        company = CompanyDB(name="MultiDrv")
        db_session.add(company)
        db_session.commit()
        for i in range(5):
            db_session.add(_make_driver(i, company.id))
        db_session.commit()
        db_session.refresh(company)
        assert len(company.drivers) == 5

    def test_manager_from_different_company_not_included(self, db_session):
        co1 = CompanyDB(name="Company1")
        co2 = CompanyDB(name="Company2")
        db_session.add_all([co1, co2])
        db_session.commit()
        db_session.add(_make_manager(1, co1.id))
        db_session.add(_make_manager(2, co2.id))
        db_session.commit()
        db_session.refresh(co1)
        assert len(co1.managers) == 1
        assert co1.managers[0].full_name == "Manager 1"

    def test_driver_belongs_to_correct_company(self, db_session):
        co1 = CompanyDB(name="FleetA")
        co2 = CompanyDB(name="FleetB")
        db_session.add_all([co1, co2])
        db_session.commit()
        db_session.add(_make_driver(1, co1.id))
        db_session.add(_make_driver(2, co2.id))
        db_session.commit()
        db_session.refresh(co2)
        assert len(co2.drivers) == 1
        assert co2.drivers[0].full_name == "Driver 2"