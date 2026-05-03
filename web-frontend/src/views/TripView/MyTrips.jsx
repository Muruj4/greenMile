import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../Dashboard/Nav";
import "./MyTrips.css";

const API_BASE = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}
function getCompanyName() {
  return localStorage.getItem("company") || sessionStorage.getItem("company") || "Company";
}

const COLOR_MAP = {
  green:  { bg: "#e8f5e9", color: "#013f2b", dot: "#10b981" },
  orange: { bg: "#fff3e0", color: "#b45309", dot: "#f59e0b" },
  red:    { bg: "#fce4ec", color: "#c62828", dot: "#ef4444" },
};

/* ── Trip Card ── */
function TripCard({ trip }) {
  const c = COLOR_MAP[trip.color] || COLOR_MAP.green;
  const date = trip.created_at
    ? new Date(trip.created_at).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

  return (
    <div className="mt-card">
      <div className="mt-card__top">
        <div className="mt-card__route">
          <span className="mt-card__dot" style={{ background: c.dot }} />
          <span className="mt-card__summary">{trip.route_summary}</span>
          <span className="mt-card__badge" style={{ background: c.bg, color: c.color }}>
            {trip.color?.toUpperCase()}
          </span>
        </div>
        <div className="mt-card__date">{date}</div>
      </div>

      <div className="mt-card__path">
        <span className="mt-card__from">📍 {trip.origin}</span>
        <span className="mt-card__arrow">→</span>
        <span className="mt-card__to">🏁 {trip.destination}</span>
      </div>

      <div className="mt-card__meta">
        <span>🗺 {trip.city}</span>
        <span>🚗 {trip.vehicle_type} · {trip.model_year}</span>
        <span>⛽ {trip.fuel_type}</span>
        <span>{trip.distance_km} km · {trip.duration_min} min</span>
      </div>

      <div className="mt-card__emissions">
        <div className="mt-card__co2e" style={{ background: c.bg, color: c.color }}>
          🌿 {trip.co2e?.toFixed(2)} kg CO₂e
        </div>
        <div className="mt-card__gases">
          <span>CO₂ {trip.co2?.toFixed(2)} kg</span>
          <span>CH₄ {trip.ch4?.toFixed(4)} kg</span>
          <span>N₂O {trip.n2o?.toFixed(4)} kg</span>
        </div>
      </div>
    </div>
  );
}

/* ── Toolbar button ── */
function ToolbarBtn({ label, active, onClick }) {
  return (
    <button className={`mt-tb-btn ${active ? "mt-tb-btn--on" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

/* ── Toolbar dropdown ── */
function ToolbarDrop({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const isActive = !!value;

  return (
    <div className="mt-tb-drop-wrap">
      <button
        className={`mt-tb-btn mt-tb-btn--drop ${isActive ? "mt-tb-btn--on" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        {value || label} ▾
      </button>
      {open && (
        <div className="mt-tb-dropdown">
          <button
            className="mt-tb-dd-item"
            onClick={() => { onChange(""); setOpen(false); }}
          >
            All
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              className={`mt-tb-dd-item ${value === opt ? "mt-tb-dd-item--on" : ""}`}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function MyTrips() {
  const navigate    = useNavigate();
  const companyName = getCompanyName();

  const [trips,   setTrips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [options, setOptions] = useState({
    cities: [], vehicle_types: [], fuel_types: [], colors: [],
  });

  const [filters, setFilters] = useState({
    color:        "",
    city:         "",
    vehicle_type: "",
    fuel_type:    "",
    date_range:   "all",
  });

  /* ── Fetch filter options ── */
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`${API_BASE}/trips/my-trips/filters`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) setOptions(await res.json());
      } catch {}
    };
    fetchOptions();
  }, []);

  /* ── Fetch trips ── */
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.color)        params.append("color",        filters.color);
      if (filters.city)         params.append("city",         filters.city);
      if (filters.vehicle_type) params.append("vehicle_type", filters.vehicle_type);
      if (filters.fuel_type)    params.append("fuel_type",    filters.fuel_type);
      if (filters.date_range && filters.date_range !== "all")
        params.append("date_range", filters.date_range);

      const res = await fetch(`${API_BASE}/trips/my-trips?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to load trips");
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const setF = (key, val) =>
    setFilters((p) => ({ ...p, [key]: p[key] === val ? "" : val }));

  const clearAll = () =>
    setFilters({ color: "", city: "", vehicle_type: "", fuel_type: "", date_range: "all" });

  const hasFilters =
    filters.color || filters.city || filters.vehicle_type ||
    filters.fuel_type || filters.date_range !== "all";

  const COLOR_LABELS = {
    green:  "🟢 Green",
    orange: "🟠 Orange",
    red:    "🔴 Red",
  };

  const DATE_LABELS = {
    week:  "📅 This Week",
    month: "📅 This Month",
    all:   "📅 All Time",
  };

  return (
    <div className="mt-page">
      <Nav companyName={companyName} />

      <div className="mt-body">

        {/* ── Header ── */}
        <div className="mt-header">
          <div>
            <h1 className="mt-title">My <em>Trips</em></h1>
            <p className="mt-sub">All trips saved by your company</p>
          </div>
          <div className="mt-header-right">
            {!loading && (
              <span className="mt-count">{trips.length} trip{trips.length !== 1 ? "s" : ""}</span>
            )}
            <button className="mt-new-btn" onClick={() => navigate("/trip")}>
              + New Trip
            </button>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="mt-toolbar">
          {/* Route color */}
          <ToolbarBtn label="🟢 Green"  active={filters.color === "green"}  onClick={() => setF("color", "green")} />
          <ToolbarBtn label="🟠 Orange" active={filters.color === "orange"} onClick={() => setF("color", "orange")} />
          <ToolbarBtn label="🔴 Red"    active={filters.color === "red"}    onClick={() => setF("color", "red")} />

          <div className="mt-tb-divider" />

          {/* Date */}
          <ToolbarBtn label="📅 This Week"  active={filters.date_range === "week"}  onClick={() => setFilters((p) => ({ ...p, date_range: p.date_range === "week"  ? "all" : "week" }))} />
          <ToolbarBtn label="📅 This Month" active={filters.date_range === "month"} onClick={() => setFilters((p) => ({ ...p, date_range: p.date_range === "month" ? "all" : "month" }))} />

          <div className="mt-tb-divider" />

          {/* City dropdown */}
          {options.cities.length > 0 && (
            <ToolbarDrop
              label="🗺 City"
              value={filters.city ? `🗺 ${filters.city}` : ""}
              options={options.cities}
              onChange={(v) => setFilters((p) => ({ ...p, city: v }))}
            />
          )}

          {/* Vehicle dropdown */}
          {options.vehicle_types.length > 0 && (
            <ToolbarDrop
              label="🚗 Vehicle"
              value={filters.vehicle_type ? `🚗 ${filters.vehicle_type}` : ""}
              options={options.vehicle_types}
              onChange={(v) => setFilters((p) => ({ ...p, vehicle_type: v }))}
            />
          )}

          {/* Fuel dropdown */}
          {options.fuel_types.length > 0 && (
            <ToolbarDrop
              label="⛽ Fuel"
              value={filters.fuel_type ? `⛽ ${filters.fuel_type}` : ""}
              options={options.fuel_types}
              onChange={(v) => setFilters((p) => ({ ...p, fuel_type: v }))}
            />
          )}

          {/* Count + clear */}
          {!loading && (
            <span className="mt-tb-count">
              {trips.length} trip{trips.length !== 1 ? "s" : ""}
            </span>
          )}
          {hasFilters && (
            <button className="mt-tb-clear" onClick={clearAll}>✕ Clear</button>
          )}
        </div>

        {/* ── Content ── */}
        {error && <div className="mt-error">⚠ {error}</div>}

        {loading ? (
          <div className="mt-grid">
            {[0,1,2,3,4,5].map((i) => <div key={i} className="mt-skeleton" />)}
          </div>
        ) : trips.length === 0 ? (
          <div className="mt-empty">
            <div className="mt-empty-icon">🗺</div>
            <div className="mt-empty-title">No trips found</div>
            <div className="mt-empty-sub">
              {hasFilters
                ? "Try adjusting your filters"
                : "Create your first trip to get started"}
            </div>
            {!hasFilters && (
              <button className="mt-new-btn" onClick={() => navigate("/trip")}>
                + Create a Trip
              </button>
            )}
          </div>
        ) : (
          <div className="mt-grid">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}