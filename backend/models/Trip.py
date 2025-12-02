import requests 

class Trip:
    def __init__(self, origin, destination, city, vehicleType, fuelType, modelYear, ghg_data, api_key):
        self.origin = origin
        self.destination = destination
        self.city = city
        self.vehicleType = vehicleType
        self.fuelType = fuelType
        self.modelYear = modelYear
        self.ghg = ghg_data
        self.api_key = api_key

    def map_vehicle_category(self, vehicle):
        return {
            "Car": "Passenger Cars",
            "SUV": "Light-Duty Trucks",
            "Van": "Light-Duty Trucks",
            "Bus": "Light-Duty Trucks",
            "Pickup Truck": "Light-Duty Trucks",
            "Truck": "Medium- and Heavy-Duty Vehicles (Trucks)",
            "Motorcycle": "Motorcycles",
        }.get(vehicle)

    def get_fuel_consumption_rate(self, category):
        return float(self.ghg["fuel_consumption"][category])

    def get_emissions_factors(self, category, fuel, year):
        for factor_row in self.ghg["factors"]:
            matches_vehicle = factor_row["vehicle_type"].lower() == category.lower()
            matches_fuel = factor_row["fuel_type"].lower() == fuel.lower()
            matches_year = factor_row["model_year_range"] == str(year)

            if matches_vehicle and matches_fuel and matches_year:
                return factor_row
        return None

    def get_closest_emissions_factors(self, category, fuel, year):
        matching_factor_rows = [
            factor_row
            for factor_row in self.ghg["factors"]
            if factor_row["vehicle_type"].lower() == category.lower()
            and factor_row["fuel_type"].lower() == fuel.lower()
        ]

        if not matching_factor_rows:
            return None

        return min(
            matching_factor_rows,
            key=lambda factor_row: abs(int(factor_row["model_year_range"]) - year),
        )

    def decode_polyline(self, polyline):
        decoded_points = []
        polyline_index = 0
        accumulated_latitude = 0
        accumulated_longitude = 0

        while polyline_index < len(polyline):
            result = 0
            shift_amount = 0

            while True:
                current_character = ord(polyline[polyline_index]) - 63
                polyline_index += 1
                result |= (current_character & 0x1F) << shift_amount
                shift_amount += 5
                if current_character < 32:
                    break

            delta_latitude = ~(result >> 1) if (result & 1) else (result >> 1)
            accumulated_latitude += delta_latitude

            result = 0
            shift_amount = 0

            while True:
                current_character = ord(polyline[polyline_index]) - 63
                polyline_index += 1
                result |= (current_character & 0x1F) << shift_amount
                shift_amount += 5
                if current_character < 32:
                    break

            delta_longitude = ~(result >> 1) if (result & 1) else (result >> 1)
            accumulated_longitude += delta_longitude

            decoded_points.append(
                (accumulated_latitude / 1e5, accumulated_longitude / 1e5)
            )

        return decoded_points

    def fetch_routes_from_google(self):
        url = "https://routes.googleapis.com/directions/v2:computeRoutes"

        request_body = {
            "origin": {"address": f"{self.origin}, {self.city}, Saudi Arabia"},
            "destination": {"address": f"{self.destination}, {self.city}, Saudi Arabia"},
            "travelMode": "DRIVE",
            "computeAlternativeRoutes": True,
            "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
            "routeModifiers": {
            "avoidTolls": False,
            "avoidHighways": False,
            "avoidFerries": False
                             },
           "languageCode": "ar",
           "regionCode": "SA",
       }

        request_headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": (
                "routes.distanceMeters,"
                "routes.duration,"
                "routes.description,"
                "routes.polyline.encodedPolyline"
            ),
        }

        response = requests.post(url, json=request_body, headers=request_headers)
        return response.json()

    def get_routes(self):
        google_raw_response = self.fetch_routes_from_google()

        if "routes" not in google_raw_response:
            return {"error": "Google returned no routes", "details": google_raw_response}

        google_routes_list = google_raw_response["routes"][:3]

        vehicle_category = self.map_vehicle_category(self.vehicleType)
        fuel_consumption_rate = self.get_fuel_consumption_rate(vehicle_category)

        emission_factors = self.get_emissions_factors(
            vehicle_category, self.fuelType, self.modelYear
        )

        if emission_factors is None:
            emission_factors = self.get_closest_emissions_factors(
                vehicle_category, self.fuelType, self.modelYear
            )

        if emission_factors is None:
            return {
                "error": f"{self.vehicleType} does not support fuel type '{self.fuelType}'",
                "details": "Choose a valid fuel type for this vehicle.",
            }

        co2_factor = emission_factors["co2_factor"]
        ch4_factor = emission_factors["ch4_factor"]
        n2o_factor = emission_factors["n2o_factor"]

        processed_routes = []

        for route_entry in google_routes_list:
            distance_kilometers = route_entry["distanceMeters"] / 1000
            fuel_used = distance_kilometers * fuel_consumption_rate

            emission_co2 = fuel_used * co2_factor
            emission_ch4 = distance_kilometers * ch4_factor
            emission_n2o = distance_kilometers * n2o_factor
            emission_co2e = emission_co2 + emission_ch4 * 25 + emission_n2o * 298

            decoded_coordinates = self.decode_polyline(
                route_entry["polyline"]["encodedPolyline"]
            )
            coordinate_pairs = [
                [lng, lat]  
              for (lat, lng) in decoded_coordinates
              ]


            processed_routes.append(
                {
                    "summary": route_entry.get("description", "Route"),
                    "distance": f"{round(distance_kilometers, 1)} km",
                    "duration": f"{int(route_entry['duration'].replace('s', '')) // 60} mins",
                    "coordinates": coordinate_pairs,
                    "emissions": {
                        "co2": emission_co2,
                        "ch4": emission_ch4,
                        "n2o": emission_n2o,
                        "co2e": emission_co2e,
                    },
                }
            )

        processed_routes.sort(key=lambda route_entry: route_entry["emissions"]["co2e"])

        color_scale = ["green", "orange", "red"]
        for index, route_entry in enumerate(processed_routes):
            route_entry["color"] = color_scale[index]

        return {"routes": processed_routes}
