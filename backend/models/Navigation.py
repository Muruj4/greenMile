from dataclasses import dataclass, field
from typing import List, Optional
import math


@dataclass
class Point:
    latitude: float
    longitude: float


@dataclass
class Navigation:
    # Route info
    coords: List[Point] = field(default_factory=list)
    destination: Optional[Point] = None
    routeDistances: List[float] = field(default_factory=list)
    totalRouteMeters: float = 0.0
    totalRouteKm: float = 0.0

    # Base speed / duration
    baseDurationMinutes: int = 0
    baseAvgSpeedKmh: float = 0.0

    # Live navigation state
    driverLocation: Optional[Point] = None
    snappedLocation: Optional[Point] = None
    heading: float = 0.0
    currentSpeedKmh: float = 0.0
    remainingKm: float = 0.0
    etaMinutes: int = 0

    # ===================== HELPERS (MATH ONLY) =====================

    @staticmethod
    def haversine_meters(a: Point, b: Point) -> float:
        """Distance between 2 lat/lng points."""
        R = 6371000.0
        lat1, lon1 = math.radians(a.latitude), math.radians(a.longitude)
        lat2, lon2 = math.radians(b.latitude), math.radians(b.longitude)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        h = (
            math.sin(dlat/2)**2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        )
        c = 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h))
        return R * c

    @staticmethod
    def find_nearest_point_index(point: Point, coords: List[Point]) -> int:
        """Return the index of nearest route vertex."""
        min_idx = 0
        min_dist = float("inf")

        for i, p in enumerate(coords):
            d = Navigation.haversine_meters(point, p)
            if d < min_dist:
                min_dist = d
                min_idx = i

        return min_idx

    @staticmethod
    def get_base_duration_minutes(duration_text: str) -> int:
        """Convert '32 mins' → 32."""
        digits = "".join(ch for ch in duration_text if ch.isdigit())
        return int(digits) if digits else 0

    @staticmethod
    def get_base_average_speed_kmh(total_km: float, base_minutes: int) -> float:
        """Avg speed = distance / hours."""
        if base_minutes <= 0:
            return 40.0  # fallback speed
        return total_km / (base_minutes / 60)

    @staticmethod
    def compute_eta(remaining_km: float, current_speed: float, base_speed: float) -> int:
        """ETA in minutes."""
        speed = current_speed if current_speed > 5 else base_speed
        if speed <= 0:
            return 0
        return round((remaining_km / speed) * 60)

    # ===================== ROUTE INITIALIZATION =====================

    def init_route(self, coords: List[dict], duration_text: str):
        """Store route points + compute static route data."""
        # Convert dict → Point
        self.coords = [Point(c["latitude"], c["longitude"]) for c in coords]

        if not self.coords:
            raise ValueError("Route has no coordinates")

        self.destination = self.coords[-1]

        # Compute cumulative route distances
        self.routeDistances = []
        total = 0.0

        for i, p in enumerate(self.coords):
            if i == 0:
                self.routeDistances.append(0.0)
            else:
                d = Navigation.haversine_meters(self.coords[i-1], p)
                total += d
                self.routeDistances.append(total)

        self.totalRouteMeters = total
        self.totalRouteKm = total / 1000

        # base duration + speed
        self.baseDurationMinutes = Navigation.get_base_duration_minutes(duration_text)
        self.baseAvgSpeedKmh = Navigation.get_base_average_speed_kmh(
            self.totalRouteKm,
            self.baseDurationMinutes
        )

        return {
            "total_km": self.totalRouteKm,
            "base_duration": self.baseDurationMinutes,
            "base_avg_speed": self.baseAvgSpeedKmh
        }

    # ===================== LIVE LOCATION UPDATES =====================

    def update_location(self, location: dict, heading: float, speed_kmh: float):
        """Compute snapped location, ETA, remaining distance."""
        self.driverLocation = Point(location["latitude"], location["longitude"])
        self.heading = heading
        self.currentSpeedKmh = speed_kmh

        # nearest vertex index
        idx = Navigation.find_nearest_point_index(self.driverLocation, self.coords)
        self.snappedLocation = self.coords[idx]

        # remaining distance
        remaining_meters = max(
            0,
            self.totalRouteMeters - self.routeDistances[idx]
        )
        self.remainingKm = remaining_meters / 1000

        # ETA
        self.etaMinutes = Navigation.compute_eta(
            self.remainingKm,
            self.currentSpeedKmh,
            self.baseAvgSpeedKmh
        )

        return {
            "snappedLocation": {
                "latitude": self.snappedLocation.latitude,
                "longitude": self.snappedLocation.longitude,
            },
            "remainingKm": self.remainingKm,
            "etaMinutes": self.etaMinutes,
            "speed": self.currentSpeedKmh,
        }
