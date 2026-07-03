import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@/lib/colors";
import { useAuth } from "@/auth/AuthContext";
import { AppMenu } from "@/components/AppMenu";
import { PosHeader } from "@/components/PosHeader";
import { LoginScreen } from "@/screens/LoginScreen";
import { PosScreen } from "@/screens/PosScreen";
import { TransactionsScreen } from "@/screens/TransactionsScreen";
import { TransactionDetailScreen } from "@/screens/TransactionDetailScreen";
import type { RootStackParamList } from "@/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenHeader = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: "700" as const },
  headerRight: () => <AppMenu />
};

function MainStack() {
  const { user, activeBranch } = useAuth();
  const title = `${user?.companyName ?? "DjajaPOS"} · ${activeBranch?.name ?? ""}`.trim();

  return (
    <Stack.Navigator screenOptions={screenHeader}>
      <Stack.Screen
        name="Kasir"
        component={PosScreen}
        options={{ title, header: () => <PosHeader /> }}
      />
      <Stack.Screen
        name="TransactionList"
        component={TransactionsScreen}
        options={{ title: "List Transaksi" }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: "Detail Transaksi" }}
      />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { user } = useAuth();
  return (
    <NavigationContainer>{user ? <MainStack /> : <LoginScreen />}</NavigationContainer>
  );
}
