from models.Trip import Trip

class TripController:
    def __init__(self, api_key, ghg_data):
        self.api_key = api_key
        self.ghg_data = ghg_data

    def process_trip(self, origin, destination, city, vehicleType, fuelType, modelYear):
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
        return trip.get_routes()
