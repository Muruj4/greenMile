// Style/RoutesScreenStyle.js
import { StyleSheet } from "react-native";

const PRIMARY = "#00542A";

export const styles = StyleSheet.create({
  container: {
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },

  metaBox: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#E5ECE7",
    borderRadius: 10,
  },

  metaText: {
    fontSize: 13,
    color: "#374151",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  cardSelected: {
    borderColor: PRIMARY,
    borderWidth: 2,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // يخلي البادج عند أعلى الكرت
    marginBottom: 6,
  },

  cardTitle: {
    fontWeight: "700",
    fontSize: 16,
    flex: 1,
    paddingRight: 8, // مساحة صغيرة قبل البادج
  },

  cardText: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 2,
  },

  // البادج (GREEN / ORANGE / RED)
  badge: {
  width: 65,        
  height: 22,        
  borderRadius: 12,  
  justifyContent: "center",
  alignItems: "center",
  marginTop: 2,
  marginRight: 4,
},

badgeText: {
  fontSize: 10,
  color: "#FFFFFF",
  fontWeight: "700",
  textAlign: "center",
},


  badge_green: {
    backgroundColor: "#16A34A",
  },

  badge_orange: {
    backgroundColor: "#EA580C",
  },

  badge_red: {
    backgroundColor: "#DC2626",
  },

  selectedText: {
    marginTop: 6,
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "600",
  },

 
  previewButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderColor: "#d4d4d4",
    marginBottom: 30,
    marginRight: 20,
    marginLeft: 20,
    borderRadius: 12,
  },

  previewButtonDisabled: {
    backgroundColor: "#D6D6D6",
  },

  previewButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
