from models.Navigation import Navigation

class NavigationController:
    def __init__(self):
        # Model instance
        self.nav = Navigation()

    # Controller does NOT calculate anything
    def init_route(self, coords, duration_text):
        # Only forwards request to the model
        return self.nav.init_route(coords, duration_text)

    # Controller does NOT calculate anything
    def location_update(self, location, heading, speed_kmh):
        # Only forwards request to the model
        return self.nav.update_location(location, heading, speed_kmh)
