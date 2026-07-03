import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { colors } from "@/lib/colors";

type Variant = "primary" | "outline" | "danger" | "cash" | "qris";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "outline" && styles.outline,
        variant === "danger" && styles.danger,
        variant === "cash" && styles.cash,
        variant === "qris" && styles.qris,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.primary : colors.white} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "outline" ? styles.labelOutline : styles.labelSolid
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  primary: { backgroundColor: colors.primary },
  cash: { backgroundColor: colors.cash },
  qris: { backgroundColor: colors.qris },
  danger: { backgroundColor: colors.danger },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { fontSize: 16, fontWeight: "700" },
  labelSolid: { color: colors.white },
  labelOutline: { color: colors.primary }
});
