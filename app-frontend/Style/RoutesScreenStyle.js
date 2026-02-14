import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00542A",
    marginBottom: 16,
  },
  metaBox: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  metaText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },

  // AI Loading
  aiLoading: {
    backgroundColor: "#f0f8ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiLoadingText: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "500",
  },

  // AI Error
  aiError: {
    backgroundColor: "#fee",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fcc",
  },
  aiErrorText: {
    fontSize: 14,
    color: "#c33",
  },

  // AI Summary
  aiSummary: {
    backgroundColor: "#27ae60",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  aiSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  aiSummaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  aiSummaryText: {
    fontSize: 14,
    color: "#fff",
    lineHeight: 20,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: "bold",
  },
  aiTip: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  aiTipText: {
    fontSize: 13,
    color: "#fff",
    lineHeight: 18,
  },

  // Route Cards
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    position: "relative",
  },
  cardSelected: {
    borderColor: "#00542A",
    borderWidth: 2,
    backgroundColor: "#f3fff4",
  },
  cardBest: {
    borderColor: "#27ae60",
    borderWidth: 2,
    backgroundColor: "#e8f5e9",
  },
  bestBadge: {
    position: "absolute",
    top: -8,
    right: 16,
    backgroundColor: "#27ae60",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    zIndex: 10,
  },
  bestBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badge_green: {
    backgroundColor: "#27ae60",
  },
  badge_orange: {
    backgroundColor: "#f39c12",
  },
  badge_red: {
    backgroundColor: "#e74c3c",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  cardText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  selectedText: {
    marginTop: 8,
    fontSize: 13,
    color: "#00542A",
    fontWeight: "600",
  },

  // AI Prediction
  aiPrediction: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  aiPredictionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#667eea",
  },
  aiPredictionValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2c3e50",
  },
  aiBestTag: {
    backgroundColor: "#27ae60",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  aiBestTagText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  aiExtraText: {
    fontSize: 12,
    color: "#e67e22",
    fontWeight: "600",
  },

  // Bottom Button
  previewButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#00542A",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewButtonDisabled: {
    backgroundColor: "#ccc",
  },
  previewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});