# backend/controllers/NavigationController.py
from typing import List, Dict, Any, Optional
from models.Navigation import Navigation, Point


class NavigationController:
    def __init__(self) -> None:
        self.nav = Navigation()

    def init_route(self, coords: List[Dict[str, float]], duration_text: str) -> Dict[str, Any]:
        points = [Point(c["latitude"], c["longitude"]) for c in coords]

        self.nav.compute_route_distances(points)
        self.nav.baseDurationMinutes = self.nav.get_base_duration_minutes(duration_text)
        self.nav.baseAvgSpeedKmh = self.nav.get_base_average_speed_kmh(
            self.nav.totalRouteKm,
            self.nav.baseDurationMinutes,
        )

        return {
            "total_km": self.nav.totalRouteKm,
            "base_duration_min": self.nav.baseDurationMinutes,
            "base_avg_speed_kmh": self.nav.baseAvgSpeedKmh,
        }

    def location_update(
        self,
        location: Dict[str, float],
        heading: float,
        speed_kmh: float,
    ) -> Dict[str, Any]:
        driver = Point(location["latitude"], location["longitude"])
        self.nav.driverLocation = driver
        self.nav.heading = heading
        self.nav.currentSpeedKmh = speed_kmh

        if self.nav.coords:
            idx = self.nav.find_nearest_point_index(driver, self.nav.coords)
            self.nav.snappedLocation = self.nav.coords[idx]
            self.nav.compute_remaining_distance(idx)
            self.nav.etaMinutes = self.nav.compute_eta(
                remaining_km=self.nav.remainingKm,
                current_speed=self.nav.currentSpeedKmh,
                base_speed=self.nav.baseAvgSpeedKmh,
            )

        def to_dict(p: Optional[Point]) -> Optional[Dict[str, float]]:
            if p is None:
                return None
            return {"latitude": p.latitude, "longitude": p.longitude}

        return {
            "driverLocation": to_dict(self.nav.driverLocation),
            "snappedLocation": to_dict(self.nav.snappedLocation),
            "heading": self.nav.heading,
            "currentSpeedKmh": self.nav.currentSpeedKmh,
            "remainingKm": self.nav.remainingKm,
            "etaMinutes": self.nav.etaMinutes,
        }
