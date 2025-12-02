import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TripScreen from "./views/TripView/TripScreen";
import MapScreen from "./views/TripView/MapScreen";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TripScreen />} />
        <Route path="/map" element={<MapScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
