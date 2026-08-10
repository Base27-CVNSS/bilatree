import { hexToBytes } from '@noble/hashes/utils';
import { nip19 } from 'nostr-tools';

/**
 * Chuỗi được mã hóa dạng hexadecimal.
 */
export class Hex {
  value: string;

  /**
   * @throws Error nếu chuỗi không phải giá trị hex hợp lệ hoặc sai độ dài yêu cầu
   */
  constructor(str: string, expectedLength?: number) {
    // Có thể mở rộng để nhận đầu vào bech32 rồi chuyển sang hex.
    this.validateHex(str, expectedLength);
    this.value = str;
  }

  private validateHex(str: string, expectedLength?: number): void {
    if (!/^[0-9a-fA-F]+$/.test(str)) {
      throw new Error(`Chuỗi đã cho không phải giá trị hex hợp lệ: "${str}"`);
    }

    if (expectedLength && str.length !== expectedLength) {
      throw new Error(`Giá trị hex không đúng độ dài ${expectedLength} ký tự: ${str}`);
    }
  }

  toBech32(prefix: string): string {
    if (!prefix) {
      throw new Error('Bắt buộc cung cấp tiền tố');
    }

    const data = hexToBytes(this.value);

    return nip19.encodeBytes(prefix, data);
  }

  get hex(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
