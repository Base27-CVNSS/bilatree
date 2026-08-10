/**
 * Sự kiện đã được xác minh là đến từ mạng Nostr.
 */
export type Message = {
  id: string;
  data: string;
  pubkey: string;
  time: number; // Khác Nostr, BilaTree dùng mili giây thay vì giây.
};

export type Header = {
  number: number;
  previousChainLength: number;
  nextPublicKey: string;
  time: number;
};

export type NostrFilter = {
  authors?: string[];
  kinds?: number[];
  '#d'?: string[];
};

/**
 * Cặp khóa dùng để mã hóa và giải mã.
 */
export type KeyPair = {
  publicKey: string;
  privateKey: Uint8Array;
};

/**
 * Trạng thái kênh Double Ratchet giữa hai bên, cần thiết để lưu bền kênh.
 */
export interface ChannelState {
  /** Khóa gốc dùng để dẫn xuất khóa chuỗi gửi/nhận mới. */
  rootKey: Uint8Array;

  /** Khóa công khai Nostr hiện tại của bên kia. */
  theirNostrPublicKey: string;

  /** Cặp khóa Nostr hiện tại của phía này dùng cho kênh. */
  ourCurrentNostrKey?: KeyPair;

  /** Cặp khóa Nostr kế tiếp, được công bố trong tin nhắn gửi đi để tiến ratchet. */
  ourNextNostrKey: KeyPair;

  /** Khóa giải mã tin nhắn đến trong chuỗi hiện tại. */
  receivingChainKey?: Uint8Array;

  /** Khóa mã hóa tin nhắn đi trong chuỗi hiện tại. */
  sendingChainKey?: Uint8Array;

  /** Số tin nhắn đã gửi trong chuỗi gửi hiện tại. */
  sendingChainMessageNumber: number;

  /** Số tin nhắn đã nhận trong chuỗi nhận hiện tại. */
  receivingChainMessageNumber: number;

  /** Số tin nhắn đã gửi trong chuỗi gửi trước. */
  previousSendingChainMessageCount: number;

  /** Bộ nhớ đệm khóa tin nhắn để xử lý tin đến sai thứ tự. */
  skippedMessageKeys: Record<string, Uint8Array>;
}

/**
 * Hủy đăng ký hoặc gỡ trình lắng nghe sự kiện.
 */
export type Unsubscribe = () => void;

/**
 * Hàm đăng ký sự kiện Nostr khớp bộ lọc và gọi onEvent cho từng sự kiện.
 */
export type NostrSubscribe = (filter: NostrFilter, onEvent: (e: NostrEvent) => void) => Unsubscribe;

export type NostrPublish = (event: Partial<NostrEvent>) => void;

export type NostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};
