// driver/App.js

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TripScreen from "./screens/TripScreen";
import RoutesScreen from "./screens/RoutesScreen"; // اسم أوضح من Results
import NavigationScreen from "./screens/NavigationScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Trip"
          component={TripScreen}
          options={{ title: "Create Trip" }}
        />
        <Stack.Screen
          name="Routes"
          component={RoutesScreen}
          options={{ title: "Route Options" }}
        />
        <Stack.Screen
          name="NavigationScreen"
          component={NavigationScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
