import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { colors } from "@/lib/colors";
import { listPairedPrinters, type PairedPrinter } from "@/printer/bluetooth";
import {
  printReceiptData,
  resolvePrinterAddress,
  savePrinterAddress
} from "@/printer/printReceipt";
import { getPrintErrorMessage } from "@/printer/errors";
import type { ReceiptData } from "@/printer/receipt";

type PrinterState = {
  printing: boolean;
  print: (data: ReceiptData) => Promise<void>;
};

const PrinterContext = createContext<PrinterState | undefined>(undefined);

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const [printing, setPrinting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [devices, setDevices] = useState<PairedPrinter[]>([]);
  const pending = useRef<ReceiptData | null>(null);

  const runPrint = useCallback(async (data: ReceiptData, address: string) => {
    setPrinting(true);
    try {
      await printReceiptData(data, address);
      Alert.alert("Berhasil", "Struk berhasil dicetak.");
    } catch (e) {
      Alert.alert("Gagal Cetak", getPrintErrorMessage(e));
    } finally {
      setPrinting(false);
    }
  }, []);

  const print = useCallback(
    async (data: ReceiptData) => {
      setPrinting(true);
      try {
        const address = await resolvePrinterAddress();
        if (!address) {
          const list = await listPairedPrinters();
          setDevices(list);
          pending.current = data;
          setPickerOpen(true);
          setPrinting(false);
          return;
        }
        await runPrint(data, address);
      } catch (e) {
        setPrinting(false);
        Alert.alert("Gagal Cetak", getPrintErrorMessage(e));
      }
    },
    [runPrint]
  );

  const onSelect = useCallback(
    async (address: string) => {
      setPickerOpen(false);
      await savePrinterAddress(address);
      const data = pending.current;
      pending.current = null;
      if (data) await runPrint(data, address);
    },
    [runPrint]
  );

  const value = useMemo(() => ({ printing, print }), [printing, print]);

  return (
    <PrinterContext.Provider value={value}>
      {children}
      <Modal
        visible={pickerOpen}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Pilih Printer</Text>
            <Text style={styles.subtitle}>
              Pilih printer EP58M yang sudah dipasangkan.
            </Text>
            {devices.map((d) => (
              <Pressable
                key={d.address}
                style={styles.deviceRow}
                onPress={() => onSelect(d.address)}
              >
                <Text style={styles.deviceName}>{d.name}</Text>
                <Text style={styles.deviceAddress}>{d.address}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.cancel}
              onPress={() => {
                pending.current = null;
                setPickerOpen(false);
              }}
            >
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {printing ? (
        <View style={styles.printingOverlay} pointerEvents="none">
          <View style={styles.printingBox}>
            <ActivityIndicator color={colors.white} />
            <Text style={styles.printingText}>Mencetak…</Text>
          </View>
        </View>
      ) : null}
    </PrinterContext.Provider>
  );
}

export function usePrinter(): PrinterState {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error("usePrinter must be used within PrinterProvider");
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  deviceRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8
  },
  deviceName: { fontSize: 15, fontWeight: "600", color: colors.text },
  deviceAddress: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cancel: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  cancelText: { color: colors.textMuted, fontWeight: "600" },
  printingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  printingBox: {
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center"
  },
  printingText: { color: colors.white, marginTop: 8, fontWeight: "600" }
});
