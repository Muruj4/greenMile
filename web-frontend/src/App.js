import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import TripScreen from "./views/TripView/TripScreen";
import MapScreen from "./views/TripView/MapScreen";
import AuthPage from "./views/Auth/AuthPage.js";

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
        {/* Auth */}
        <Route path="/" element={<AuthPage />} />

        {/* Protected pages */}
        <Route
          path="/trip"
          element={
            <ProtectedRoute>
              <TripScreen />
            </ProtectedRoute>
          }
        />

        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapScreen />
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;