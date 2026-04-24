import { useNavigate, useLocation } from "react-router-dom";
import "./Nav.css";

export default function Navbar({ companyName = "Company" }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <header className="navbar">
      <div className="navbar__logo">GreenMile</div>

      <nav className="navbar__links">
        <button
          className={`navbar__btn ${
            pathname === "/dashboard" ? "navbar__btn--on" : ""
          }`}
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </button>

        <button
          className={`navbar__btn ${
            pathname === "/trip" ? "navbar__btn--on" : ""
          }`}
          onClick={() => navigate("/trip")}
        >
          Create a Trip
        </button>

        <button
          className={`navbar__btn ${
            pathname === "/trips" ? "navbar__btn--on" : ""
          }`}
          onClick={() => navigate("/trips")}
        >
          My Trips
        </button>
      </nav>

      <div className="navbar__right">
        <span className="navbar__chip">{monthLabel}</span>
        <span className="navbar__company">{companyName}</span>

        <img
          src="/favicon.ico"
          alt="Profile"
          className="navbar__avatarImg"
        />
      </div>
    </header>
  );
}