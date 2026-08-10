import { TextDecoder, TextEncoder } from 'node:util';

// Bảo đảm thư viện mật mã nhận Uint8Array cùng realm với môi trường Node.
// JSDOM có thể cung cấp TextEncoder của realm khác và khiến @noble/hashes từ chối đầu vào.
Object.assign(globalThis, { TextDecoder, TextEncoder });

const localEntries = new Map<string, string>();
const mockLocalStorage: Storage = {
  get length() {
    return localEntries.size;
  },
  clear() {
    localEntries.clear();
  },
  getItem(key: string) {
    return localEntries.get(key) ?? null;
  },
  key(index: number) {
    return [...localEntries.keys()][index] ?? null;
  },
  removeItem(key: string) {
    localEntries.delete(key);
  },
  setItem(key: string, value: string) {
    localEntries.set(key, String(value));
  },
};
Object.assign(globalThis, { localStorage: mockLocalStorage });

class MockBroadcastChannel {
  name: string;
  listeners: Array<(event: { data: any }) => void> = [];

  constructor(name: string) {
    this.name = name;
  }

  postMessage(message: any) {
    this.listeners.forEach((listener) => listener({ data: message }));
  }

  addEventListener(event: string, listener: (event: { data: any }) => void) {
    if (event === 'message') {
      this.listeners.push(listener);
    }
  }

  close() {
    this.listeners = [];
  }
}

// Cung cấp BroadcastChannel giả lập cho môi trường kiểm thử.
global.BroadcastChannel = MockBroadcastChannel as any;
