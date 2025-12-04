// driver/Style/NavigationScreenStyles.js
import { StyleSheet } from "react-native";

const PRIMARY = "#00542A";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 20,
    backgroundColor: PRIMARY,
    padding: 10,
    borderRadius: 50,
  },

  header: {
    paddingTop: 90,
    paddingBottom: 10,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  headerSub: {
    fontSize: 14,
    color: "#555",
  },

  map: {
    flex: 1,
  },

  infoBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },

  infoLabel: {
    fontSize: 12,
    color: "#666",
  },

  infoText: {
    fontSize: 14,
    fontWeight: "600",
  },

  infoSubText: {
    fontSize: 12,
    color: PRIMARY,
  },

  speedBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  speedText: {
    fontSize: 20,
    fontWeight: "700",
    color: PRIMARY,
  },

  startButton: {
    backgroundColor: PRIMARY,
    padding: 16,
    alignItems: "center",
  },

  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  exitButton: {
    backgroundColor: "#DC2626",
    padding: 16,
    alignItems: "center",
  },

  exitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
