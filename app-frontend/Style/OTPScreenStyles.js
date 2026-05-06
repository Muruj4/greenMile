export const otpStyles = {
  container: {
    flex: 1,
    backgroundColor: "#f6faf8",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  backButton: {
    position: "absolute",
    top: 60,
    left: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  backText: {
    color: "#475569",
    fontSize: 14,
    fontFamily: "Fraunces_700Bold",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    alignItems: "center",
  },

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(5,150,105,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 26,
    fontFamily: "Fraunces_700Bold",
    fontWeight: "bold",
    color: "#080b13",
    marginBottom: 10,
    textAlign: "center",
  },

  description: {
    fontSize: 14,
    fontFamily: "Fraunces_600SemiBold",
    color: "#475569",
    textAlign: "center",
    lineHeight: 21,
    fontWeight: "600",
  },

  email: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 14,
    fontFamily: "Fraunces_400Regular",
    color: "#013f2b",
    fontWeight: "900",
    textAlign: "center",
  },

  input: {
    width: "100%",
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
    backgroundColor: "#ffffff",
    textAlign: "center",
    fontSize: 28,
    fontFamily: "Fraunces_400Regular",
    letterSpacing: 14,
    fontWeight: "900",
    color: "#080b13",
    paddingLeft: 14,
  },

  inputError: {
    borderColor: "#ef4444",
  },

  errorText: {
    color: "#ef4444",
    fontSize: 13,
    fontFamily: "Fraunces_600SemiBold",
    marginTop: 10,
    textAlign: "center",
    fontWeight: "600",
  },

  button: {
    marginTop: 22,
    width: "100%",
    borderRadius: 16,
    paddingVertical: 15,
    backgroundColor: "#013f2b",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Fraunces_400Regular",
    fontWeight: "900",
  },
};