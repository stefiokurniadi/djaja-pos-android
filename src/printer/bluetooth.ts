import { PermissionsAndroid, Platform } from "react-native";
import RNBluetoothClassic, {
  type BluetoothDevice
} from "react-native-bluetooth-classic";
import { PrintError } from "@/printer/errors";

export type PairedPrinter = {
  address: string;
  name: string;
};

/** Android 12+ requires BLUETOOTH_CONNECT/SCAN at runtime. */
export async function ensureBluetoothPermissions(): Promise<void> {
  if (Platform.OS !== "android") return;
  if (Platform.Version < 31) return;

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
  ]);

  const granted =
    result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
    PermissionsAndroid.RESULTS.GRANTED;

  if (!granted) throw new PrintError("PERMISSION_DENIED");
}

export async function ensureBluetoothReady(): Promise<void> {
  let available = false;
  try {
    available = await RNBluetoothClassic.isBluetoothAvailable();
  } catch {
    throw new PrintError("BLUETOOTH_UNAVAILABLE");
  }
  if (!available) throw new PrintError("BLUETOOTH_UNAVAILABLE");

  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) throw new PrintError("BLUETOOTH_DISABLED");
}

export async function listPairedPrinters(): Promise<PairedPrinter[]> {
  await ensureBluetoothPermissions();
  await ensureBluetoothReady();
  const devices = await RNBluetoothClassic.getBondedDevices();
  return devices.map((d) => ({ address: d.address, name: d.name || d.address }));
}

async function getConnectedDevice(address: string): Promise<BluetoothDevice> {
  const existing = await RNBluetoothClassic.getConnectedDevice(address).catch(
    () => null
  );
  if (existing) {
    const stillConnected = await existing.isConnected().catch(() => false);
    if (stillConnected) return existing;
  }

  try {
    const device = await RNBluetoothClassic.connectToDevice(address, {
      connectorType: "rfcomm",
      delimiter: ""
    });
    return device;
  } catch (e) {
    const detail = e instanceof Error ? e.message : undefined;
    throw new PrintError("CONNECT_FAILED", detail);
  }
}

/** Send base64-encoded ESC/POS bytes to a paired printer over SPP/RFCOMM. */
export async function writeBase64ToPrinter(
  address: string,
  base64: string
): Promise<void> {
  await ensureBluetoothPermissions();
  await ensureBluetoothReady();

  const device = await getConnectedDevice(address);
  try {
    await RNBluetoothClassic.writeToDevice(address, base64, "base64");
  } catch (e) {
    const detail = e instanceof Error ? e.message : undefined;
    throw new PrintError("WRITE_FAILED", detail);
  } finally {
    await device.clear().catch(() => undefined);
  }
}
