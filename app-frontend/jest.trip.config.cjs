// jest.trip.config.cjs
module.exports = {
  preset: "jest-expo",
  testEnvironment: "jsdom",

  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],

  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|react-native-web|@react-navigation|expo|expo-location|expo-status-bar|expo-linking|expo-modules-core)/)",
  ],

  testMatch: ["<rootDir>/tests/**/*.test.jsx"],

};
