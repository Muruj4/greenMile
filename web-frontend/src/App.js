import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import TripScreen    from "./views/TripView/TripScreen";
import MapScreen     from "./views/TripView/MapScreen";
import ConfirmScreen from "./views/TripView/ConfirmScreen";
import MyTrips       from "./views/TripView/MyTrips.jsx";
import AuthPage      from "./views/Auth/AuthPage.js";
import Dashboard     from "./views/Dashboard/Dashboard.jsx";

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

function ProtectedRoute({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/trip"      element={<ProtectedRoute><TripScreen /></ProtectedRoute>} />
        <Route path="/map"       element={<ProtectedRoute><MapScreen /></ProtectedRoute>} />
        <Route path="/confirm"   element={<ProtectedRoute><ConfirmScreen /></ProtectedRoute>} />
        <Route path="/trips"     element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;