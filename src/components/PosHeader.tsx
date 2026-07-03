import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@/lib/colors";
import { useAuth } from "@/auth/AuthContext";
import { AppMenu } from "@/components/AppMenu";
import { fetchTransactions } from "@/api/transactions";
import type { Transaction } from "@/api/types";

function currentTime(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SG";
  const letters = parts.slice(0, 2).map((p) => p[0]);
  return letters.join("").toUpperCase();
}

export function PosHeader() {
  const insets = useSafeAreaInsets();
  const { user, activeBranch } = useAuth();
  const [time, setTime] = useState(currentTime);

  useEffect(() => {
    const id = setInterval(() => setTime(currentTime()), 20000);
    return () => clearInterval(id);
  }, []);

  const branchId = activeBranch?.id;

  const txQ = useQuery<Transaction[]>({
    queryKey: ["transactions", branchId],
    queryFn: () => fetchTransactions(branchId),
    enabled: !!branchId
  });
  const orderNo = (txQ.data?.length ?? 0) + 1;

  const companyName = user?.companyName ?? "DjajaPOS";
  const branchName = activeBranch?.name ?? "—";

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.left}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>{initialsOf(companyName)}</Text>
        </View>
        <View>
          <Text style={styles.company} numberOfLines={1}>
            {companyName}
          </Text>
          <Text style={styles.branch} numberOfLines={1}>
            {branchName}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Kasir aktif</Text>
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.order}>Order #{orderNo}</Text>
        </View>
        <AppMenu />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.headerBg,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: { color: colors.white, fontWeight: "800", fontSize: 14 },
  company: { color: colors.white, fontWeight: "800", fontSize: 16 },
  branch: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 },
  right: { flexDirection: "row", alignItems: "center", gap: 14 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80"
  },
  statusText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  orderInfo: { alignItems: "flex-end" },
  time: { color: colors.white, fontWeight: "700", fontSize: 14 },
  order: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 1 }
});
