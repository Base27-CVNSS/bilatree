import { LocalStorageMemoryAdapter } from './adapters/LocalStorageMemoryAdapter.ts';
import {
  Adapter,
  Callback,
  JsonObject,
  JsonValue,
  NodeValue,
  Subscription,
  TypeGuard,
  Unsubscribe,
} from './types.ts';

export const DIRECTORY_VALUE = {};

/**
 * Kiểm tra giá trị có phải nút thư mục hay không (đối tượng rỗng {}).
 * @param value
 */
export const isDirectory = (value: JsonValue) =>
  typeof value === 'object' &&
  value !== null && // không có thuộc tính
  Object.keys(value).length === 0 &&
  !Array.isArray(value);

/**
 * Node đại diện cho một truy vấn/đường dẫn trong cây. Dữ liệu thật được các Adapter lưu giữ.
 *
 * Node có thể là nút nhánh (thư mục) hoặc nút lá (giá trị).
 */
export class Node {
  id: string;
  parent: Node | null;
  private children = new Map<string, Node>();
  private onSubscriptions = new Map<number, Subscription>();
  private forEachSubscriptions = new Map<number, Subscription>();
  private adapters: Adapter[];
  private counter = 0;

  /**
   */
  constructor({ id = '', adapters, parent = null }: NodeProps = {}) {
    this.id = id;
    this.parent = parent;
    this.adapters = adapters ?? parent?.adapters ?? [new LocalStorageMemoryAdapter()];
  }

  /**
   * Lấy một nút con.
   * @param key
   * @returns {Node}
   * @example node.get('ung-dung/tai-lieu/thu-nghiem').put({ten: 'Tài liệu thử'})
   * @example node.get('ung-dung').get('tai-lieu').get('thu-nghiem').on((value) => console.log(`Tên: ${value.ten}`))
   */
  get(key: string): Node {
    const splitKey = key.split('/');
    let node = this.children.get(splitKey[0]);
    if (!node) {
      node = new Node({ id: `${this.id}/${splitKey[0]}`, parent: this });
      this.children.set(splitKey[0], node);
    }
    if (splitKey.length > 1) {
      return node.get(splitKey.slice(1).join('/'));
    }
    return node;
  }

  private async putValue(value: JsonValue, updatedAt: number, expiresAt?: number) {
    if (!isDirectory(value)) {
      this.children = new Map();
    }
    const nodeValue: NodeValue = {
      updatedAt,
      value,
      expiresAt,
    };
    const promises = this.adapters.map((adapter) => adapter.set(this.id, nodeValue));
    this.notifyChange(value, updatedAt);
    await Promise.all(promises);
  }

  private async putChildValues(value: JsonObject, updatedAt: number, expiresAt?: number) {
    const promises = this.adapters.map((adapter) =>
      adapter.set(this.id, { value: DIRECTORY_VALUE, updatedAt, expiresAt }),
    );
    const children = Object.keys(value);
    // Đoạn dưới có thể khiến cùng callback được kích hoạt nhiều lần hơn cần thiết.
    const childPromises = children.map((key) => this.get(key).put(value[key], updatedAt));
    await Promise.all([...promises, ...childPromises]);
  }

  /**
   * Ghi giá trị vào nút. Nếu giá trị là đối tượng, mỗi thuộc tính sẽ trở thành một nút con.
   * @param value
   * @example node.get('ung-dung/tai-lieu/thu-nghiem').put({ten: 'Tài liệu thử'})
   */
  async put(value: JsonValue, updatedAt = Date.now(), expiresAt?: number) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length
    ) {
      await this.putChildValues(value, updatedAt, expiresAt);
    } else {
      await this.putValue(value, updatedAt, expiresAt);
    }

    if (this.parent) {
      await this.parent.put(DIRECTORY_VALUE, updatedAt);
      const childName = this.id.split('/').pop()!;
      if (!this.parent.children.has(childName)) {
        this.parent.children.set(childName, this);
      }
      for (const [id, { callback, recursion }] of this.parent.forEachSubscriptions) {
        if (!isDirectory(value) || recursion === 0) {
          // TODO: cân nhắc trả đường dẫn npub thay cho this.id.
          callback(value, this.id, updatedAt, () => {
            this.parent?.forEachSubscriptions.delete(id);
          });
        } else if (recursion > 0) {
          // TODO: hoàn thiện cơ chế đệ quy.
          //this.open(callback, recursion - 1);
        }
      }
    }
  }

  /**
   * Đăng ký mọi nút con và nhận chúng trong cùng một đối tượng tổng hợp.
   */
  open<T = JsonValue>(
    callback: Callback<T>,
    recursion = 0,
    typeGuard = (value: Record<string, JsonValue>) => value as T,
  ): Unsubscribe {
    const aggregated: Record<string, JsonValue> = {};
    let latestTime: number | undefined;
    return this.forEach((childValue, path, updatedAt) => {
      if (updatedAt !== undefined && (!latestTime || latestTime < updatedAt)) {
        latestTime = updatedAt;
      }
      const childName = path.split('/').pop()!;
      aggregated[childName] = childValue;
      callback(typeGuard(aggregated), path.split('/').slice(0, -1).join('/'), latestTime, () => {});
    }, recursion);
  }

  /**
   * Đăng ký nhận giá trị và các lần thay đổi của nút.
   */
  on<T = JsonValue>(
    callback: Callback<T>,
    returnIfUndefined: boolean = false,
    recursion = 1,
    typeGuard: TypeGuard<T> = (value: JsonValue) => value as T,
    latestOnly = true,
  ): Unsubscribe {
    let latestValue: NodeValue | null = null;
    const latestByPath = new Map<string, NodeValue>();
    let openUnsubscribe: Unsubscribe | undefined;
    const uniqueId = this.counter++;

    const localCallback: Callback = (value, path, updatedAt, unsubscribe) => {
      const olderThanLatest =
        latestValue !== null && updatedAt !== undefined && latestValue.updatedAt >= updatedAt;
      const noReturnUndefined = !returnIfUndefined && value === undefined;
      if (noReturnUndefined) {
        return;
      }

      if (latestOnly && olderThanLatest) {
        return;
      }

      if (!latestOnly && updatedAt !== undefined) {
        const existing = latestByPath.get(path);
        if (existing && existing.updatedAt >= updatedAt) {
          return;
        }
        latestByPath.set(path, { value, updatedAt });
      }

      const returnUndefined = !latestValue && returnIfUndefined && value === undefined;
      if (returnUndefined) {
        callback(value, path, updatedAt, unsubscribe);
        return;
      }

      if (value !== undefined && updatedAt !== undefined) {
        latestValue = { value, updatedAt };
      }

      if (isDirectory(value) && recursion > 0 && !openUnsubscribe) {
        openUnsubscribe = this.open<T>(callback, recursion - 1, typeGuard);
      }

      if (!isDirectory(value) || recursion === 0) {
        callback(typeGuard(value), path, updatedAt, unsubscribe);
      }
    };

    this.onSubscriptions.set(uniqueId, { callback: localCallback, recursion });

    const adapterUnsubscribes = this.adapters.map((adapter) => adapter.get(this.id, localCallback));

    const unsubscribeAll = () => {
      this.onSubscriptions.delete(uniqueId);
      adapterUnsubscribes.forEach((unsub) => unsub());
      openUnsubscribe?.();
    };

    return unsubscribeAll;
  }

  private notifyChange(value: JsonValue, updatedAt?: number) {
    this.onSubscriptions.forEach(({ callback, recursion }) => {
      if (recursion > 0 && isDirectory(value)) return;
      callback(
        value && typeof value === 'object' ? { ...value } : value, // sao chép đối tượng trước khi thông báo
        this.id,
        updatedAt,
        () => {},
      );
    });
    // Thông báo forEachSubscriptions theo cơ chế tương tự khi cần.
  }

  /**
   * Đăng ký thay đổi của từng nút con.
   * @param callback
   */
  forEach<T = JsonValue>(
    callback: Callback<T>,
    recursion: number = 0,
    typeGuard: TypeGuard<T> = (value: JsonValue) => value as T,
  ): Unsubscribe {
    // Tên map/list cần được cân nhắc; callback hiện chạy riêng cho từng thay đổi của nút con.
    const id = this.counter++;
    const typedCallback: Callback = (value, path, updatedAt, unsubscribe) => {
      callback(typeGuard(value), path, updatedAt, unsubscribe);
    };
    this.forEachSubscriptions.set(id, { callback: typedCallback, recursion });
    const latestMap = new Map<string, NodeValue<T | undefined>>();

    let adapterSubs: Unsubscribe[] = [];
    const openUnsubs: Record<string, Unsubscribe> = {}; // Lưu hàm hủy đăng ký theo đường dẫn con.

    const unsubscribeFromAdapters = () => {
      adapterSubs.forEach((unsub) => unsub());
    };

    const cb: Callback<T> = (value, path, updatedAt) => {
      const latest = latestMap.get(path);
      if (updatedAt !== undefined && latest && latest.updatedAt >= updatedAt) {
        return;
      }

      if (updatedAt !== undefined) {
        latestMap.set(path, { value, updatedAt });
      }

      const childName = path.split('/').pop()!;

      if (recursion > 0 && value && isDirectory(value)) {
        if (!openUnsubs[childName]) {
          // Kiểm tra nút con đã có hàm hủy đăng ký hay chưa.
          openUnsubs[childName] = this.get(childName).open(callback, recursion - 1);
        }
      } else {
        callback(value, path, updatedAt, () => {
          this.forEachSubscriptions.delete(id);
          unsubscribeFromAdapters();
          Object.values(openUnsubs).forEach((unsub) => unsub()); // Hủy toàn bộ đăng ký con.
        });
      }
    };

    adapterSubs = this.adapters.map((adapter) =>
      adapter.list(this.id, (value, path, updatedAt, unsubscribe) => {
        cb(typeGuard(value), path, updatedAt, unsubscribe);
        return () => {};
      }),
    );

    const unsubscribe = () => {
      this.forEachSubscriptions.delete(id);
      unsubscribeFromAdapters();
      Object.values(openUnsubs).forEach((unsub) => unsub()); // Hủy toàn bộ đăng ký con.
    };

    return unsubscribe;
  }

  /**
   * Tương tự on(), nhưng tự hủy đăng ký sau callback đầu tiên.
   * @param callback
   */
  once<T = JsonValue>(
    callback?: Callback<T>,
    returnIfUndefined = false,
    recursion = 1,
    typeGuard = (value: JsonValue) => value as T,
  ): Promise<T | undefined> {
    return new Promise((resolve) => {
      let resolved = false;
      const cb: Callback<T> = (value, updatedAt, path, unsub) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
        callback?.(value, updatedAt, path, () => {});
        unsub();
      };
      this.on(cb, returnIfUndefined, recursion, typeGuard);
    });
  }
}

export type NodeProps = {
  id?: string;
  adapters?: Adapter[];
  parent?: Node | null;
};
