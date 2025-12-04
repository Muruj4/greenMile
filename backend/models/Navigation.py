# backend/models/Navigation.py
from dataclasses import dataclass, field
from typing import List, Optional
import math


@dataclass
class Point:
    latitude: float
    longitude: float


@dataclass
class Navigation:
    coords: List[Point] = field(default_factory=list)
    destination: Optional[Point] = None
    routeDistances: List[float] = field(default_factory=list)
    totalRouteMeters: float = 0.0
    totalRouteKm: float = 0.0
    baseDurationMinutes: int = 0
    baseAvgSpeedKmh: float = 0.0

    driverLocation: Optional[Point] = None
    snappedLocation: Optional[Point] = None
    heading: float = 0.0
    currentSpeedKmh: float = 0.0
    remainingKm: float = 0.0
    etaMinutes: int = 0

    @staticmethod
    def haversine_meters(a: Point, b: Point) -> float:
        R = 6371000.0
        lat1 = math.radians(a.latitude)
        lon1 = math.radians(a.longitude)
        lat2 = math.radians(b.latitude)
        lon2 = math.radians(b.longitude)

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        h = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h))
        return R * c

    @staticmethod
    def find_nearest_point_index(point: Point, coords: List[Point]) -> int:
        min_idx = 0
        min_dist = float("inf")
        for i, p in enumerate(coords):
            d = Navigation.haversine_meters(point, p)
            if d < min_dist:
                min_dist = d
                min_idx = i
        return min_idx

    def compute_route_distances(self, coords: List[Point]) -> List[float]:
        self.coords = coords
        self.destination = coords[-1] if coords else None

        total = 0.0
        self.routeDistances = []
        for i, p in enumerate(coords):
            if i == 0:
                self.routeDistances.append(0.0)
            else:
                total += self.haversine_meters(coords[i - 1], p)
                self.routeDistances.append(total)

        self.totalRouteMeters = total
        self.totalRouteKm = total / 1000.0 if total else 0.0
        return self.routeDistances

    @staticmethod
    def get_base_duration_minutes(duration_text: str) -> int:
        digits = "".join(ch for ch in duration_text if ch.isdigit())
        return int(digits) if digits else 0

    @staticmethod
    def get_base_average_speed_kmh(total_km: float, base_minutes: int) -> float:
        if base_minutes <= 0:
            return 40.0
        return total_km / (base_minutes / 60.0)

    def compute_remaining_distance(self, current_index: int) -> float:
        if (
            not self.routeDistances
            or current_index < 0
            or current_index >= len(self.routeDistances)
        ):
            self.remainingKm = 0.0
            return 0.0

        remaining_meters = max(
            0.0, self.totalRouteMeters - self.routeDistances[current_index]
        )
        self.remainingKm = remaining_meters / 1000.0
        return self.remainingKm

    @staticmethod
    def compute_eta(remaining_km: float, current_speed: float, base_speed: float) -> int:
        effective_speed = current_speed if current_speed > 5 else base_speed
        if effective_speed <= 0:
            return 0
        minutes = (remaining_km / effective_speed) * 60.0
        return round(minutes)
