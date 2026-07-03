import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Button } from "@/components/Button";
import { colors } from "@/lib/colors";
import { useAuth } from "@/auth/AuthContext";
import { apiErrorMessage } from "@/api/client";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(apiErrorMessage(e, "Login gagal. Periksa email dan kata sandi."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brand}>DjajaPOS</Text>
          <Text style={styles.subtitle}>Aplikasi Kasir</Text>
        </View>

        <View style={styles.cardWrap}>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="kasir@toko.com"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Kata Sandi</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Masuk"
            onPress={onSubmit}
            loading={submitting}
            style={styles.submit}
          />
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.primary },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  brand: { fontSize: 36, fontWeight: "800", color: colors.white },
  subtitle: { fontSize: 16, color: colors.white, opacity: 0.9, marginTop: 4 },
  cardWrap: { width: "50%", alignSelf: "center" },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16
  },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13 },
  submit: { marginTop: 4 }
});
