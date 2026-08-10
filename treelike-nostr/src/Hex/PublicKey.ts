import { nip19 } from 'nostr-tools';

import { Hex } from './Hex';

/**
 * Khóa công khai Nostr ở dạng chuỗi hexadecimal.
 */
export class PublicKey extends Hex {
  npubValue: string | undefined;

  /**
   * @param str chuỗi được mã hóa dạng hex hoặc npub
   * @throws Error nếu chuỗi không phải khóa công khai Nostr hợp lệ
   */
  constructor(str: string) {
    const isNpub = str.startsWith('npub');
    let hexValue = str;
    if (isNpub) {
      const res = nip19.decode(str);
      if (res.type === 'npub') {
        hexValue = res.data;
      } else {
        throw new Error(`Không thể giải mã npub ${str}`);
      }
    }
    super(hexValue, 64);
    if (isNpub) {
      this.npubValue = str; // Giữ nguyên giá trị Bech32 ban đầu.
    }
  }

  get npub(): string {
    if (!this.npubValue) {
      this.npubValue = super.toBech32('npub');
    }
    return this.npubValue;
  }

  equals(other: PublicKey | string): boolean {
    if (typeof other === 'string') {
      if (other === this.value) {
        return true;
      }
      other = new PublicKey(other);
    }
    return this.value === other.value;
  }
}
