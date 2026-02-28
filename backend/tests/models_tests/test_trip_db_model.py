"""
tests/test_trip_model.py

Full test suite for TripDB model.
Relies on the shared engine/db_session fixtures in conftest.py.
"""

import pytest
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from models.trip_db    import TripDB
from models.company_db import CompanyDB
from models.driver_db  import DriverDB



# Helpers

def _persisted_company(db_session, name="TripCo"):
    co = CompanyDB(name=name)
    db_session.add(co)
    db_session.commit()
    return co

def _persisted_driver(db_session, company_id, n=1):
    driver = DriverDB(
        full_name     = f"Driver {n}",
        email         = f"tripdriver{n}@test.com",
        password_hash = "hashed",
        company_id    = company_id,
    )
    db_session.add(driver)
    db_session.commit()
    return driver

def _trip(company_id, driver_id=None, **overrides):
    """Return a valid TripDB instance. Override any field via kwargs."""
    defaults = dict(
        saved_by_role = "manager",
        saved_by_id   = 1,
        company_id    = company_id,
        driver_id     = driver_id,
        origin        = "Airport",
        destination   = "City Centre",
        city          = "Riyadh",
        vehicle_type  = "Car",
        fuel_type     = "Petrol",
        model_year    = 2022,
        created_at    = datetime(2024, 1, 15, 10, 30),
        route_summary = "Via Highway 1",
        distance_km   = 35.5,
        duration_min  = 42,
        coordinates   = [[46.67, 24.71], [46.68, 24.72]],
        co2           = 8.2,
        ch4           = 0.03,
        n2o           = 0.01,
        co2e          = 8.5,
        color         = "green",
    )
    defaults.update(overrides)
    return TripDB(**defaults)




# 1. MODEL STRUCTURE TESTS

class TestModelStructure:
    """Verify table name, all columns, constraints, and relationships."""

    def test_table_name(self):
        assert TripDB.__tablename__ == "trips"

    def test_id_is_primary_key(self):
        assert TripDB.__table__.c["id"].primary_key is True

    def test_id_is_indexed(self):
        assert TripDB.__table__.c["id"].index is True


    def test_saved_by_role_not_nullable(self):
        assert TripDB.__table__.c["saved_by_role"].nullable is False

    def test_saved_by_id_not_nullable(self):
        assert TripDB.__table__.c["saved_by_id"].nullable is False

    def test_company_id_not_nullable(self):
        assert TripDB.__table__.c["company_id"].nullable is False

    def test_driver_id_is_nullable(self):
        """driver_id is optional — trip can be saved by a manager with no driver."""
        assert TripDB.__table__.c["driver_id"].nullable is True

   
    def test_origin_not_nullable(self):
        assert TripDB.__table__.c["origin"].nullable is False

    def test_destination_not_nullable(self):
        assert TripDB.__table__.c["destination"].nullable is False

    def test_city_not_nullable(self):
        assert TripDB.__table__.c["city"].nullable is False

    def test_vehicle_type_not_nullable(self):
        assert TripDB.__table__.c["vehicle_type"].nullable is False

    def test_fuel_type_not_nullable(self):
        assert TripDB.__table__.c["fuel_type"].nullable is False

    def test_model_year_not_nullable(self):
        assert TripDB.__table__.c["model_year"].nullable is False

    def test_created_at_not_nullable(self):
        assert TripDB.__table__.c["created_at"].nullable is False


    def test_route_summary_not_nullable(self):
        assert TripDB.__table__.c["route_summary"].nullable is False

    def test_distance_km_not_nullable(self):
        assert TripDB.__table__.c["distance_km"].nullable is False

    def test_duration_min_not_nullable(self):
        assert TripDB.__table__.c["duration_min"].nullable is False

    def test_coordinates_not_nullable(self):
        assert TripDB.__table__.c["coordinates"].nullable is False

  
    def test_co2_not_nullable(self):
        assert TripDB.__table__.c["co2"].nullable is False

    def test_ch4_not_nullable(self):
        assert TripDB.__table__.c["ch4"].nullable is False

    def test_n2o_not_nullable(self):
        assert TripDB.__table__.c["n2o"].nullable is False

    def test_co2e_not_nullable(self):
        assert TripDB.__table__.c["co2e"].nullable is False

    def test_color_is_nullable(self):
        """color is optional (green/orange/red — may not be computed yet)."""
        assert TripDB.__table__.c["color"].nullable is True

    # ── Relationship ─────────────────────────────────────────────────────────
    def test_driver_relationship_declared(self):
        assert hasattr(TripDB, "driver")

    def test_table_exists_in_db(self, engine):
        from sqlalchemy import inspect
        assert "trips" in inspect(engine).get_table_names()

    def test_all_columns_exist_in_db(self, engine):
        from sqlalchemy import inspect
        cols = [c["name"] for c in inspect(engine).get_columns("trips")]
        expected = [
            "id", "saved_by_role", "saved_by_id", "company_id", "driver_id",
            "origin", "destination", "city", "vehicle_type", "fuel_type",
            "model_year", "created_at", "route_summary", "distance_km",
            "duration_min", "coordinates", "co2", "ch4", "n2o", "co2e", "color",
        ]
        for col in expected:
            assert col in cols, f"Missing column: {col}"



# CREATE TESTS


class TestCreate:

    def test_create_valid_trip_with_driver(self, db_session):
        co = _persisted_company(db_session)
        dr = _persisted_driver(db_session, co.id)
        trip = _trip(co.id, dr.id)
        db_session.add(trip)
        db_session.commit()
        assert trip.id is not None

    def test_create_trip_without_driver(self, db_session):
        """driver_id is nullable — manager-only trip is valid."""
        co = _persisted_company(db_session, "NoDrvCo")
        trip = _trip(co.id, driver_id=None)
        db_session.add(trip)
        db_session.commit()
        assert trip.id is not None
        assert trip.driver_id is None

    def test_created_trip_fields_correct(self, db_session):
        co = _persisted_company(db_session, "FieldCo")
        trip = _trip(co.id, origin="King Khalid Airport", destination="Kingdom Centre")
        db_session.add(trip)
        db_session.commit()
        assert trip.origin        == "King Khalid Airport"
        assert trip.destination   == "Kingdom Centre"
        assert trip.city          == "Riyadh"
        assert trip.vehicle_type  == "Car"
        assert trip.fuel_type     == "Petrol"
        assert trip.model_year    == 2022
        assert trip.distance_km   == 35.5
        assert trip.duration_min  == 42
        assert trip.co2           == 8.2
        assert trip.co2e          == 8.5
        assert trip.color         == "green"

    def test_coordinates_stored_and_retrieved(self, db_session):
        co = _persisted_company(db_session, "CoordCo")
        coords = [[46.67, 24.71], [46.68, 24.72], [46.69, 24.73]]
        trip = _trip(co.id, coordinates=coords)
        db_session.add(trip)
        db_session.commit()
        db_session.refresh(trip)
        assert trip.coordinates == coords

    def test_create_trip_with_null_color(self, db_session):
        co = _persisted_company(db_session, "NullColorCo")
        trip = _trip(co.id, color=None)
        db_session.add(trip)
        db_session.commit()
        assert trip.color is None

    def test_multiple_trips_get_unique_ids(self, db_session):
        co = _persisted_company(db_session, "MultiTripCo")
        t1 = _trip(co.id)
        t2 = _trip(co.id)
        db_session.add_all([t1, t2])
        db_session.commit()
        assert t1.id != t2.id

    def test_created_at_default_is_set(self, db_session):
        """When created_at is not explicitly provided, the default fires."""
        co = _persisted_company(db_session, "DefaultDtCo")
        trip = TripDB(
            saved_by_role = "manager",
            saved_by_id   = 1,
            company_id    = co.id,
            origin        = "A",
            destination   = "B",
            city          = "Riyadh",
            vehicle_type  = "Car",
            fuel_type     = "Petrol",
            model_year    = 2022,
            route_summary = "Direct",
            distance_km   = 10.0,
            duration_min  = 15,
            coordinates   = [[46.0, 24.0]],
            co2=1.0, ch4=0.01, n2o=0.005, co2e=1.1,
        )
        db_session.add(trip)
        db_session.commit()
        assert trip.created_at is not None
        assert isinstance(trip.created_at, datetime)


    def test_null_saved_by_role_raises(self, db_session):
        co = _persisted_company(db_session, "NullRoleCo")
        db_session.add(_trip(co.id, saved_by_role=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_saved_by_id_raises(self, db_session):
        co = _persisted_company(db_session, "NullByIdCo")
        db_session.add(_trip(co.id, saved_by_id=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_company_id_raises(self, db_session):
        db_session.add(_trip(company_id=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_origin_raises(self, db_session):
        co = _persisted_company(db_session, "NullOriCo")
        db_session.add(_trip(co.id, origin=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_destination_raises(self, db_session):
        co = _persisted_company(db_session, "NullDstCo")
        db_session.add(_trip(co.id, destination=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_distance_km_raises(self, db_session):
        co = _persisted_company(db_session, "NullDistCo")
        db_session.add(_trip(co.id, distance_km=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_null_co2_raises(self, db_session):
        co = _persisted_company(db_session, "NullCO2Co")
        db_session.add(_trip(co.id, co2=None))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_invalid_company_id_raises(self, db_session):
        """FK constraint: company must exist."""
        db_session.add(_trip(company_id=99999))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_invalid_driver_id_raises(self, db_session):
        """FK constraint: driver must exist if driver_id is provided."""
        co = _persisted_company(db_session, "BadDrvCo")
        db_session.add(_trip(co.id, driver_id=99999))
        with pytest.raises(IntegrityError):
            db_session.commit()



# READ TESTS

class TestRead:

    def test_read_by_id(self, db_session):
        co = _persisted_company(db_session, "ReadCo")
        trip = _trip(co.id, origin="ReadOrigin")
        db_session.add(trip)
        db_session.commit()
        fetched = db_session.get(TripDB, trip.id)
        assert fetched is not None
        assert fetched.origin == "ReadOrigin"

    def test_read_nonexistent_returns_none(self, db_session):
        assert db_session.get(TripDB, 99999) is None

    def test_read_by_company_id(self, db_session):
        co = _persisted_company(db_session, "ReadByCo")
        db_session.add_all([_trip(co.id), _trip(co.id)])
        db_session.commit()
        results = db_session.query(TripDB).filter_by(company_id=co.id).all()
        assert len(results) == 2

    def test_read_by_city(self, db_session):
        co = _persisted_company(db_session, "CityCo")
        db_session.add(_trip(co.id, city="Jeddah"))
        db_session.commit()
        result = db_session.query(TripDB).filter_by(city="Jeddah").first()
        assert result is not None
        assert result.city == "Jeddah"

    def test_read_by_color(self, db_session):
        co = _persisted_company(db_session, "ColorCo")
        db_session.add(_trip(co.id, color="red"))
        db_session.add(_trip(co.id, color="green"))
        db_session.commit()
        red_trips = db_session.query(TripDB).filter_by(color="red").all()
        assert len(red_trips) == 1

    def test_read_trips_without_driver(self, db_session):
        co = _persisted_company(db_session, "NoDrvReadCo")
        db_session.add(_trip(co.id, driver_id=None))
        db_session.commit()
        results = db_session.query(TripDB).filter(TripDB.driver_id.is_(None)).all()
        assert len(results) >= 1



# UPDATE TESTS

class TestUpdate:

    def test_update_origin(self, db_session):
        co = _persisted_company(db_session, "UpdOriCo")
        trip = _trip(co.id)
        db_session.add(trip)
        db_session.commit()
        trip.origin = "New Origin"
        db_session.commit()
        assert db_session.get(TripDB, trip.id).origin == "New Origin"

    def test_update_color(self, db_session):
        co = _persisted_company(db_session, "UpdColorCo")
        trip = _trip(co.id, color="green")
        db_session.add(trip)
        db_session.commit()
        trip.color = "red"
        db_session.commit()
        assert db_session.get(TripDB, trip.id).color == "red"

    def test_update_emissions(self, db_session):
        co = _persisted_company(db_session, "UpdEmissionCo")
        trip = _trip(co.id, co2=5.0, co2e=5.5)
        db_session.add(trip)
        db_session.commit()
        trip.co2  = 9.9
        trip.co2e = 10.2
        db_session.commit()
        fetched = db_session.get(TripDB, trip.id)
        assert fetched.co2  == 9.9
        assert fetched.co2e == 10.2

    def test_update_coordinates(self, db_session):
        co = _persisted_company(db_session, "UpdCoordCo")
        trip = _trip(co.id, coordinates=[[1.0, 2.0]])
        db_session.add(trip)
        db_session.commit()
        new_coords = [[3.0, 4.0], [5.0, 6.0]]
        trip.coordinates = new_coords
        db_session.commit()
        db_session.refresh(trip)
        assert trip.coordinates == new_coords

    def test_assign_driver_to_driverless_trip(self, db_session):
        co = _persisted_company(db_session, "AssignDrvCo")
        dr = _persisted_driver(db_session, co.id, n=99)
        trip = _trip(co.id, driver_id=None)
        db_session.add(trip)
        db_session.commit()
        assert trip.driver_id is None
        trip.driver_id = dr.id
        db_session.commit()
        assert db_session.get(TripDB, trip.id).driver_id == dr.id

    def test_update_does_not_change_id(self, db_session):
        co = _persisted_company(db_session, "StableIdCo")
        trip = _trip(co.id)
        db_session.add(trip)
        db_session.commit()
        original_id = trip.id
        trip.city = "Jeddah"
        db_session.commit()
        assert trip.id == original_id



# DELETE TESTS


class TestDelete:

    def test_delete_trip(self, db_session):
        co = _persisted_company(db_session, "DelCo")
        trip = _trip(co.id)
        db_session.add(trip)
        db_session.commit()
        tid = trip.id
        db_session.delete(trip)
        db_session.commit()
        assert db_session.get(TripDB, tid) is None

    def test_delete_only_targets_specific_trip(self, db_session):
        co = _persisted_company(db_session, "DelTargetCo")
        t1 = _trip(co.id)
        t2 = _trip(co.id)
        db_session.add_all([t1, t2])
        db_session.commit()
        db_session.delete(t2)
        db_session.commit()
        assert db_session.get(TripDB, t1.id) is not None
        assert db_session.get(TripDB, t2.id) is None

    def test_delete_all_trips(self, db_session):
        co = _persisted_company(db_session, "DelAllCo")
        db_session.add_all([_trip(co.id), _trip(co.id)])
        db_session.commit()
        db_session.query(TripDB).delete()
        db_session.commit()
        assert db_session.query(TripDB).count() == 0

    def test_delete_trip_does_not_delete_driver(self, db_session):
        co = _persisted_company(db_session, "DelTripKeepDrvCo")
        dr = _persisted_driver(db_session, co.id, n=50)
        trip = _trip(co.id, dr.id)
        db_session.add(trip)
        db_session.commit()
        did = dr.id
        db_session.delete(trip)
        db_session.commit()
        assert db_session.get(DriverDB, did) is not None

    def test_delete_trip_does_not_delete_company(self, db_session):
        co = _persisted_company(db_session, "DelTripKeepCoCo")
        trip = _trip(co.id)
        db_session.add(trip)
        db_session.commit()
        cid = co.id
        db_session.delete(trip)
        db_session.commit()
        assert db_session.get(CompanyDB, cid) is not None

    def test_delete_driver_cascades_trips(self, db_session):
        """DriverDB has cascade='all, delete-orphan' on trips —
        deleting a driver should remove their trips too."""
        co = _persisted_company(db_session, "CascadeTripCo")
        dr = _persisted_driver(db_session, co.id, n=77)
        trip = _trip(co.id, dr.id)
        db_session.add(trip)
        db_session.commit()
        tid = trip.id
        db_session.delete(dr)
        db_session.commit()
        assert db_session.get(TripDB, tid) is None



# RELATIONSHIP TESTS

class TestRelationships:

    def test_trip_linked_to_driver(self, db_session):
        co = _persisted_company(db_session, "RelDrvCo")
        dr = _persisted_driver(db_session, co.id, n=1)
        trip = _trip(co.id, dr.id)
        db_session.add(trip)
        db_session.commit()
        db_session.refresh(trip)
        assert trip.driver is not None
        assert trip.driver.id == dr.id

    def test_trip_driver_full_name_correct(self, db_session):
        co = _persisted_company(db_session, "DrvNameCo")
        dr = _persisted_driver(db_session, co.id, n=2)
        trip = _trip(co.id, dr.id)
        db_session.add(trip)
        db_session.commit()
        db_session.refresh(trip)
        assert trip.driver.full_name == "Driver 2"

    def test_trip_without_driver_has_none(self, db_session):
        co = _persisted_company(db_session, "NoDrvRelCo")
        trip = _trip(co.id, driver_id=None)
        db_session.add(trip)
        db_session.commit()
        db_session.refresh(trip)
        assert trip.driver is None

    def test_trip_appears_in_driver_trips_list(self, db_session):
        co = _persisted_company(db_session, "AppearsCo")
        dr = _persisted_driver(db_session, co.id, n=3)
        trip = _trip(co.id, dr.id)
        db_session.add(trip)
        db_session.commit()
        db_session.refresh(dr)
        assert trip in dr.trips

    def test_multiple_trips_linked_to_same_driver(self, db_session):
        co = _persisted_company(db_session, "MultiTripDrvCo")
        dr = _persisted_driver(db_session, co.id, n=4)
        for _ in range(3):
            db_session.add(_trip(co.id, dr.id))
        db_session.commit()
        db_session.refresh(dr)
        assert len(dr.trips) == 3

    def test_trips_isolated_between_drivers(self, db_session):
        co  = _persisted_company(db_session, "IsoTripCo")
        dr1 = _persisted_driver(db_session, co.id, n=5)
        dr2 = _persisted_driver(db_session, co.id, n=6)
        for _ in range(2):
            db_session.add(_trip(co.id, dr1.id))
        db_session.add(_trip(co.id, dr2.id))
        db_session.commit()
        db_session.refresh(dr1)
        db_session.refresh(dr2)
        assert len(dr1.trips) == 2
        assert len(dr2.trips) == 1

    def test_trip_not_in_wrong_driver_trips(self, db_session):
        co  = _persisted_company(db_session, "WrongDrvCo")
        dr1 = _persisted_driver(db_session, co.id, n=7)
        dr2 = _persisted_driver(db_session, co.id, n=8)
        trip = _trip(co.id, dr1.id)
        db_session.add(trip)
        db_session.commit()
        db_session.refresh(dr2)
        assert trip not in dr2.trips