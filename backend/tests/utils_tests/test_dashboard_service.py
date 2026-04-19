import pytest
from unittest.mock import Mock
from backend.utils.dashboard_service import (
    get_total_drivers,
    get_fuel_cost_savings_percentage,
    get_total_trips,
    get_total_vehicles,
    get_total_co2e_current_month,
    get_route_distribution_current_month,
    get_emissions_breakdown_current_month,
)


class TestDashboardServiceUnit:
    def test_get_total_drivers_counts_distinct_non_null_driver_ids(self):
        db = Mock()
        db.query.return_value.filter.return_value.distinct.return_value.count.return_value = 3

        result = get_total_drivers(1, db)

        assert result == 3

    def test_get_total_trips_returns_company_trip_count(self):
        db = Mock()
        db.query.return_value.filter.return_value.count.return_value = 8

        result = get_total_trips(1, db)

        assert result == 8

    def test_get_total_vehicles_returns_distinct_vehicle_types(self):
        db = Mock()
        db.query.return_value.filter.return_value.distinct.return_value.count.return_value = 4

        result = get_total_vehicles(1, db)

        assert result == 4

    def test_get_total_co2e_current_month_returns_rounded_total(self):
        db = Mock()
        db.query.return_value.filter.return_value.scalar.return_value = 1234.567

        result = get_total_co2e_current_month(1, db)

        assert result == 1234.57

    def test_get_route_distribution_current_month_counts_colors_correctly(self):
        db = Mock()
        db.query.return_value.filter.return_value.all.return_value = [
            ("green",),
            ("orange",),
            ("red",),
            ("yellow",),
            ("GREEN",),
        ]

        result = get_route_distribution_current_month(1, db)

        assert result == {
            "green": 2,
            "orange": 2,
            "red": 1,
        }

    def test_get_emissions_breakdown_current_month_returns_rounded_values(self):
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = (100.1234, 0.123456, 0.987654)

        result = get_emissions_breakdown_current_month(1, db)

        assert result == {
            "co2": 100.12,
            "ch4": 0.1235,
            "n2o": 0.9877,
        }

    def test_get_fuel_cost_savings_percentage_returns_zero_when_no_routes_exist(self):
        db = Mock()
        db.query.return_value.filter.return_value.all.return_value = []

        result = get_fuel_cost_savings_percentage(1, db)

        assert result == 0

    def test_get_fuel_cost_savings_percentage_returns_zero_when_trip_has_no_routes_json(self):
        trip = Mock()
        trip.routes_json = None

        db = Mock()
        db.query.return_value.filter.return_value.all.return_value = [trip]

        result = get_fuel_cost_savings_percentage(1, db)

        assert result == 0

    def test_get_fuel_cost_savings_percentage_calculates_correct_percentage(self):
        trip = Mock()
        trip.routes_json = {
            "routes": [
                {"color": "green", "fuel_used_liters": 10},
                {"color": "red", "fuel_used_liters": 20},
            ]
        }

        db = Mock()
        db.query.return_value.filter.return_value.all.return_value = [trip]

        result = get_fuel_cost_savings_percentage(1, db)

        assert result == 50.0