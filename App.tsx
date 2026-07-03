import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { PrinterProvider } from "@/printer/PrinterContext";
import { AppNavigator } from "@/navigation/AppNavigator";
import { colors } from "@/lib/colors";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false }
  }
});

function Gate() {
  const { isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }
  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PrinterProvider>
            <StatusBar hidden />
            <Gate />
          </PrinterProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  }
});
