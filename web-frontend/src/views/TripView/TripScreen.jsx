import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TripScreen.css";

export default function TripScreen() {
  const navigate = useNavigate();

  const [vehicleType, setVehicleType] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [fuelType, setFuelType] = useState("Petrol");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const years = Array.from({ length: 2025 - 1960 + 1 }, (_, i) => 2025 - i);

  async function submit_trip(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      
      const res = await fetch("http://127.0.0.1:8000/process_trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          city,
          vehicleType,
          fuelType,
          modelYear,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
      throw new Error(data.error || "Failed to fetch routes");
                          }

      //After backend processing → go to MapScreen with routes
      navigate("/map", { state: { routes: data.routes } });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="trip-screen">
      <h2>Create a <span className="highlight">Trip</span></h2>

      <form onSubmit={submit_trip}>

        {/* VEHICLE + YEAR */}
        <div className="form-row">
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            required
          >
            <option value="">Vehicle Type</option>
            <option>Car</option>
            <option>SUV</option>
            <option>Van</option>
            <option>Bus</option>
            <option>Pickup Truck</option>
            <option>Truck</option>
            <option>Motorcycle</option>
          </select>

          <select
            value={modelYear}
            onChange={(e) => setModelYear(e.target.value)}
            required
          >
            <option value="">Model Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* FUEL */}
        <div className="fuel-toggle">
          <button
            type="button"
            className={fuelType === "Petrol" ? "active" : ""}
            onClick={() => setFuelType("Petrol")}
          >
            Petrol
          </button>
          <button
            type="button"
            className={fuelType === "Diesel" ? "active" : ""}
            onClick={() => setFuelType("Diesel")}
          >
            Diesel
          </button>
        </div>

        {/* CITY */}
        <select value={city} onChange={(e) => setCity(e.target.value)} required>
          <option value="">Select City</option>
          <option>Riyadh</option>
          <option>Jeddah</option>
          <option>Dammam</option>
          <option>Khobar</option>
          <option>Dhahran</option>
          <option>Makkah</option>
          <option>Madinah</option>
          <option>Taif</option>
          <option>Tabuk</option>
          <option>Abha</option>
          <option>Khamis Mushait</option>
          <option>Jubail</option>
          <option>Hail</option>
          <option>Yanbu</option>
        </select>

        {/* ORIGIN */}
        <input
          placeholder="Origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          required
        />

        {/* DESTINATION */}
        <input
          placeholder="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Fetching routes..." : "Create Trip"}
        </button>

        {error && <p className="error-message">⚠️ {error}</p>}
      </form>
    </div>
  );
}
