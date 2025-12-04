// driver/api.js

const BASE_URL = "http://192.168.0.112:8000"; 

// PROCESS TRIP  → Used in TripScreen

export async function processTrip(tripData) {
  try {
    const res = await fetch(`${BASE_URL}/process_trip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tripData),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("processTrip() error:", err);
    throw err;
  }
}

// INIT NAVIGATION ROUTE → Used in NavigationScreen

export async function initNavigationRoute(coords, durationText) {
  try {
    const res = await fetch(`${BASE_URL}/navigation/init_route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coords: coords,
        duration_text: durationText,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("initNavigationRoute() error:", err);
    throw err;
  }
}

// 3) SEND LOCATION UPDATE → Used in NavigationScreen

export async function sendLocationUpdate(location, heading, speedKmh) {
  try {
    const res = await fetch(`${BASE_URL}/navigation/location_update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: location,
        heading: heading,
        speed_kmh: speedKmh, // 👈 Matches backend exactly
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("sendLocationUpdate() error:", err);
    throw err;
  }
}
