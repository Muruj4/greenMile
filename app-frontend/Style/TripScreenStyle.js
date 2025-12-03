// src/screens/TripScreen.styles.js
import { StyleSheet } from "react-native";

const PRIMARY = "#00542A";

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F5F5" },
  container: { padding: 20 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24 },
  highlight: { color: PRIMARY },
  row: { flexDirection: "row", gap: 12 },

  block: { flex: 1, marginBottom: 20 },
  label: { fontSize: 13, color: "#6B7280", marginBottom: 6 },

  selectBox: {
    backgroundColor: "#E5ECE7",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  placeholderText: { flex: 1, color: "#9CA3AF" },
  valueText: { flex: 1, color: "#111827" },
  arrow: { color: "#6B7280", fontSize: 16 },

  dropdown: {
    marginTop: 4,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    overflow: "hidden",
  },
  dropdownItem: { padding: 10 },
  dropdownItemText: { fontSize: 14 },

  fuelBox: {
    flexDirection: "row",
    backgroundColor: "#E5ECE7",
    borderRadius: 8,
    overflow: "hidden",
  },
  fuelButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  fuelButtonActive: { backgroundColor: PRIMARY },
  fuelText: { color: "#111" },
  fuelTextActive: { color: "#FFF", fontWeight: "600" },

  inputWithIcon: {
    backgroundColor: "#E5ECE7",
    borderRadius: 8,
    flexDirection: "row",
    paddingHorizontal: 12,
    alignItems: "center",
  },
  inputField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  icon: { marginLeft: 8, fontSize: 16 },

  button: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFF", fontWeight: "600", fontSize: 16 },
});
