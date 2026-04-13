import { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";
import Nav from "./Nav";
import "./Dashboard.css";

const API_BASE = "http://127.0.0.1:8000";

function getCompanyId() {
  return localStorage.getItem("company_id") || sessionStorage.getItem("company_id") || "1";
}
function getCompanyName() {
  return localStorage.getItem("company") || sessionStorage.getItem("company") || "Company";
}
function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function KpiCard({ label, value, unit, sub, subRed, accent }) {
  return (
    <div className={`kpi-card kpi-card--${accent}`}>
      <div className="kpi-card__label">{label}</div>
      <div className={`kpi-card__value${subRed ? " kpi-card__value--red" : ""}`}>
        {value}{unit && <span className="kpi-card__unit"> {unit}</span>}
      </div>
      <div className={`kpi-card__sub${subRed ? " kpi-card__sub--red" : ""}`}>{sub}</div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="kpi-card kpi-card--skeleton" />;
}

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const donutRef = useRef(null);
  const barRef   = useRef(null);
  const ringRef  = useRef(null);
  const gaugeRef = useRef(null);
  const donutChart = useRef(null);
  const barChart   = useRef(null);
  const ringChart  = useRef(null);

  const companyId   = getCompanyId();
  const companyName = getCompanyName();

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/dashboard/${companyId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [companyId]);

  useEffect(() => {
    if (!data) return;

    const dist      = data.routeDistribution  || {};
    const breakdown = data.emissionsBreakdown  || {};
    const savings   = data.get_fuel_cost_savings_percentage || 0;
    const green  = dist.green  || 0;
    const orange = dist.orange || 0;
    const red    = dist.red    || 0;

    if (donutRef.current) {
      donutChart.current?.destroy();
      donutChart.current = new Chart(donutRef.current, {
        type: "doughnut",
        data: {
          labels: ["Green", "Orange", "Red"],
          datasets: [{ data: [green, orange, red], backgroundColor: ["#10b981","#f59e0b","#ef4444"], borderWidth: 3, borderColor: "#fff", hoverOffset: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { display: false } } },
      });
    }

    if (barRef.current) {
      barChart.current?.destroy();
      barChart.current = new Chart(barRef.current, {
        type: "bar",
        data: {
          labels: ["CO₂", "CH₄", "N₂O"],
          datasets: [{ data: [breakdown.co2 || 0, breakdown.ch4 || 0, breakdown.n2o || 0], backgroundColor: ["#10b981","#f59e0b","#ef4444"], borderRadius: 5, borderSkipped: false }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { ticks: { color: "#9aada0", font: { size: 10 } }, grid: { display: false } }, y: { display: false } },
        },
      });
    }

    if (ringRef.current) {
      ringChart.current?.destroy();
      ringChart.current = new Chart(ringRef.current, {
        type: "doughnut",
        data: { datasets: [{ data: [savings, Math.max(0, 100 - savings)], backgroundColor: ["#f59e0b","#f0f4f1"], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "75%", plugins: { legend: { display: false }, tooltip: { enabled: false } } },
      });
    }

    if (gaugeRef.current) {
      const canvas = gaugeRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const trips       = data.totalTrips || 1;
      const co2eKg      = data.totalCO2e  || 0;
      const co2ePerTrip = co2eKg / trips;
      const efficiency  = Math.min(15, Math.max(0, 15 - (co2ePerTrip / 5000) * 15));
      const cx = canvas.width / 2, cy = canvas.height - 4;
      const r  = Math.min(cx, cy) - 8;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI); ctx.strokeStyle = "#e8ede8"; ctx.lineWidth = 9; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + (efficiency / 15) * Math.PI); ctx.strokeStyle = "#013f2b"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.stroke();
    }
  }, [data]);

  useEffect(() => {
    return () => { donutChart.current?.destroy(); barChart.current?.destroy(); ringChart.current?.destroy(); };
  }, []);

  const dist      = data?.routeDistribution  || {};
  const breakdown = data?.emissionsBreakdown  || {};
  const savings   = data?.get_fuel_cost_savings_percentage || 0;
  const green  = dist.green  || 0;
  const orange = dist.orange || 0;
  const red    = dist.red    || 0;
  const total  = green + orange + red || 1;

  const trips       = data?.totalTrips || 1;
  const co2eKg      = data?.totalCO2e  || 0;
  const co2ePerTrip = co2eKg / trips;

  const co2eDisplay = co2eKg >= 1000
    ? `${(co2eKg / 1000).toFixed(2)} t`
    : `${co2eKg.toFixed(2)} kg`;

  const effLabel = co2ePerTrip < 500 ? "Excellent efficiency" : co2ePerTrip < 2000 ? "Good efficiency" : "Needs improvement";
  const effDisplay = co2ePerTrip.toFixed(1);
  const estimatedReturn = savings > 0 ? Math.round((data?.totalTrips || 0) * savings * 2.18 * 0.8) : 0;

  return (
    <div className="dashboard-page">
      <Nav companyName={companyName} />
      <main className="dashboard-body">
        {error && <div className="dashboard-error">⚠ {error}</div>}

        <section className="dashboard-section">
          <div className="section-title">Core KPIs</div>
          <div className="kpi-grid">
            {loading ? [0,1,2,3].map(i => <SkeletonCard key={i} />) : (
              <>
                <KpiCard label="Total Trips"    value={data?.totalTrips?.toLocaleString() ?? "—"} sub="All time"           accent="green" />
                <KpiCard label="Total Drivers"  value={data?.totalDrivers ?? "—"}                 sub="Linked to company"  accent="blue"  />
                <KpiCard label="Vehicle Types"  value={data?.totalVehicles ?? "—"}                sub="Distinct types used" accent="amber" />
                <KpiCard label="Total CO₂e"     value={co2eDisplay}                               sub="This month" subRed  accent="red"   />
              </>
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-title">Efficiency &amp; Sustainability</div>
          <div className="mid-grid">
            <div className="panel">
              <div className="panel__title">Route Distribution</div>
              {loading ? <div className="panel__skeleton" /> : (
                <>
                  <div className="rb-row"><span className="rb-dot rb-dot--green"/><span className="rb-name rb-name--green">Green</span><div className="rb-track"><div className="rb-fill rb-fill--green" style={{width:`${(green/total)*100}%`}}/></div><span className="rb-count">{green}</span></div>
                  <div className="rb-row"><span className="rb-dot rb-dot--orange"/><span className="rb-name rb-name--orange">Orange</span><div className="rb-track"><div className="rb-fill rb-fill--orange" style={{width:`${(orange/total)*100}%`}}/></div><span className="rb-count">{orange}</span></div>
                  <div className="rb-row"><span className="rb-dot rb-dot--red"/><span className="rb-name rb-name--red">Red</span><div className="rb-track"><div className="rb-fill rb-fill--red" style={{width:`${(red/total)*100}%`}}/></div><span className="rb-count">{red}</span></div>
                  <div className="chart-wrap chart-wrap--donut"><canvas ref={donutRef}/></div>
                </>
              )}
            </div>

            <div className="panel">
              <div className="panel__title">Emissions Breakdown</div>
              {loading ? <div className="panel__skeleton" /> : (
                <>
                  <div className="em-row"><span className="em-name">CO₂</span><div className="em-track"><div className="em-fill em-fill--green" style={{width:"100%"}}/></div><span className="em-val">{breakdown.co2?.toFixed(2) ?? "—"} kg</span></div>
                  <div className="em-row"><span className="em-name">CH₄</span><div className="em-track"><div className="em-fill em-fill--amber" style={{width:"38%"}}/></div><span className="em-val">{breakdown.ch4?.toFixed(4) ?? "—"} kg</span></div>
                  <div className="em-row"><span className="em-name">N₂O</span><div className="em-track"><div className="em-fill em-fill--red" style={{width:"20%"}}/></div><span className="em-val">{breakdown.n2o?.toFixed(4) ?? "—"} kg</span></div>
                  <div className="chart-wrap chart-wrap--bar"><canvas ref={barRef}/></div>
                </>
              )}
            </div>

            <div className="panel panel--center">
              <div className="panel__title">Avg. Trip Efficiency</div>
              {loading ? <div className="panel__skeleton" /> : (
                <div className="gauge-wrap">
                  <canvas ref={gaugeRef} width={148} height={80}/>
                  <div className="gauge-number">{effDisplay}</div>
                  <div className="gauge-unit">CO₂e kg / trip</div>
                  <div className="gauge-badge">{effLabel}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-title">Financial</div>
          <div className="fin-grid">
            <div className="fin-card">
              <div className="fin-card__label">Estimated Financial Return</div>
              <div className="fin-card__value">SAR {loading ? "—" : estimatedReturn.toLocaleString("en-US")}</div>
              <div className="fin-card__sub">Fuel savings vs worst-case routes</div>
            </div>
            <div className="sav-card">
              <div className="sav-card__left">
                <div className="sav-card__label">Fuel Cost Savings</div>
                <div className="sav-card__value">{loading ? "—" : `${savings.toFixed(1)}%`}</div>
                <div className="sav-card__sub">Green vs red route comparison</div>
              </div>
              <div className="chart-wrap chart-wrap--ring"><canvas ref={ringRef}/></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}