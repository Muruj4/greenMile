from models.Trip import Trip
from models.trip_db import TripDB

class TripController:
    def __init__(self, api_key, ghg_data):
        self.api_key = api_key
        self.ghg_data = ghg_data

    def process_trip(
        self,
        origin,
        destination,
        city,
        vehicleType,
        fuelType,
        modelYear,
        db,
        saved_by_role="manager",
        saved_by_id=1,
        company_id=1,
        driver_id=None
    ):
        try:
            trip = Trip(
                origin,
                destination,
                city,
                vehicleType,
                fuelType,
                modelYear,
                self.ghg_data,
                self.api_key,
            )

            trip_result = trip.get_routes()

            if "error" in trip_result:
                return trip_result

            routes = trip_result["routes"]
            selected_route = routes[0]

            db_trip = TripDB(
                saved_by_role=saved_by_role,
                saved_by_id=saved_by_id,
                company_id=company_id,
                driver_id=driver_id,
                origin=origin,
                destination=destination,
                city=city,
                vehicle_type=vehicleType,
                fuel_type=fuelType,
                model_year=modelYear,
                route_summary=selected_route["summary"],
                distance_km=selected_route["distance_km"],
                duration_min=selected_route["duration_min"],
                coordinates=selected_route["coordinates"],
                co2=selected_route["emissions"]["co2"],
                ch4=selected_route["emissions"]["ch4"],
                n2o=selected_route["emissions"]["n2o"],
                co2e=selected_route["emissions"]["co2e"],
                color=selected_route["color"],
                routes_json=trip_result,
                selected_route_color=selected_route["color"]
            )

            db.add(db_trip)
            db.commit()
            db.refresh(db_trip)

            return {
                "message": "Trip processed and saved successfully",
                "trip_id": db_trip.id,
                "selected_route_color": db_trip.selected_route_color,
                "routes": trip_result["routes"]
            }

        except Exception as e:
            return {"error": "Trip processing failed", "details": str(e)}
        