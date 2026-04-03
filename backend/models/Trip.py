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
            "Truck": "Medium- and Heavy-Duty Vehicles",
            "Motorcycle": "Motorcycles",
        }.get(vehicle)

   
    def get_fuel_consumption_rate(self, category):
        try:
            return float(self.ghg["fuel_consumption"][category])
        except Exception:
            raise ValueError(f"Fuel consumption rate missing for category '{category}'")
    
    def get_emissions_factors(self, category, fuel, year):
        try:
            if category is None:
                raise ValueError(f"Vehicle category mapping failed for '{self.vehicleType}'")
            if fuel is None:
                raise ValueError(f"Fuel type is missing for '{self.fuelType}'")
            if year is None:
                raise ValueError("Model year is missing")

            category_norm = str(category).strip().lower()
            fuel_norm = str(fuel).strip().lower()
            year_norm = str(year).strip()

            for factor_row in self.ghg["factors"]:
                row_vehicle = str(factor_row.get("vehicle_type", "")).strip().lower()
                row_fuel = str(factor_row.get("fuel_type", "")).strip().lower()
                row_year = str(factor_row.get("model_year_range", "")).strip()

                if (
                    row_vehicle == category_norm
                    and row_fuel == fuel_norm
                    and row_year == year_norm
                ):
                    return factor_row

            return None

        except Exception as e:
            raise ValueError(f"Error in get_emissions_factors: {str(e)}")

    def get_closest_emissions_factors(self, category, fuel, year):
        try:
            category_norm = str(category).strip().lower()
            fuel_norm = str(fuel).strip().lower()

            matching = [
                row for row in self.ghg["factors"]
                if str(row.get("vehicle_type", "")).strip().lower() == category_norm
                and str(row.get("fuel_type", "")).strip().lower() == fuel_norm
            ]

            if not matching:
                return None

            return min(
                matching,
                key=lambda row: abs(int(row.get("model_year_range", 0)) - int(year))
            )

        except Exception as e:
            raise ValueError(f"Error selecting closest emission factor: {str(e)}")

    
    def decode_polyline(self, polyline):
        try:
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

        except Exception:
            raise ValueError("Failed to decode polyline — Google returned invalid shape data")

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

        try:
            response = requests.post(url, json=request_body, headers=request_headers)
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            return {"error": "Failed to contact Google Directions API", "details": str(e)}

    def get_routes(self):
        try:
            google_response = self.fetch_routes_from_google()

            if "error" in google_response:
                return google_response

            if "routes" not in google_response:
                return {"error": "Google returned no routes", "details": google_response}

            google_routes_list = google_response["routes"][:3]

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
                duration_minutes = int(route_entry["duration"].replace("s", "")) // 60


                emission_co2 = fuel_used * co2_factor
                emission_ch4 = distance_kilometers * ch4_factor
                emission_n2o = distance_kilometers * n2o_factor
                emission_co2e = emission_co2 + emission_ch4 * 25 + emission_n2o * 298

                decoded_coordinates = self.decode_polyline(
                    route_entry["polyline"]["encodedPolyline"]
                )

                coordinate_pairs = [
                    [lng, lat] for (lat, lng) in decoded_coordinates
                ]

                processed_routes.append(
                    {
        "summary": route_entry.get("description", "Route"),
        "distance_km": round(distance_kilometers, 2),
        "duration_min": duration_minutes,
        "distance": f"{round(distance_kilometers, 2)} km",
        "duration": f"{duration_minutes} mins",
        "coordinates": coordinate_pairs,
        "fuel_used_liters": round(fuel_used, 3),
        "emissions": {
            "co2": round(emission_co2, 5),
            "ch4": round(emission_ch4, 5),
            "n2o": round(emission_n2o, 5),
            "co2e": round(emission_co2e, 5),
       
        },
    }
        )  
                    

            processed_routes.sort(key=lambda r: r["emissions"]["co2e"])

            color_scale = ["green", "orange", "red"]
            for indix, route in enumerate(processed_routes):
                route["color"] = color_scale[indix]

            return {"routes": processed_routes}

        except Exception as e:
            return {"error": "Unexpected backend failure", "details": str(e)}