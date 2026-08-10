import { Adapter, Callback, NodeValue, Unsubscribe } from '../types';

/**
 * Adapter IndexedDB hoạt động trong cả luồng chính và Service Worker.
 */
export class IndexedDBAdapter implements Adapter {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;
  private callbacks = new Map<string, Set<Callback>>();
  private idbFactory: IDBFactory;

  constructor(dbName = 'treelike', storeName = 'keyval') {
    this.dbName = dbName;
    this.storeName = storeName;
    // Chọn IDBFactory phù hợp theo ngữ cảnh thực thi.
    this.idbFactory = typeof window !== 'undefined' ? window.indexedDB : self.indexedDB;
    this.dbReady = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.idbFactory.open(this.dbName, 1);

      request.onerror = () => {
        console.error('Lỗi IndexedDB:', request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('IndexedDB đang bị khóa. Hãy đóng các tab hoặc cửa sổ khác.');
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Xử lý lỗi kết nối cơ sở dữ liệu.
        this.db.onerror = (event) => {
          console.error('Lỗi IndexedDB:', (event as ErrorEvent).error);
        };

        // Đóng kết nối khi tab/worker khác nâng phiên bản cơ sở dữ liệu.
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.dbReady = this.initDB();
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // Tạo kho với chỉ mục ghép phục vụ truy vấn theo đường dẫn.
          const store = db.createObjectStore(this.storeName, { keyPath: 'path' });
          store.createIndex('pathIndex', 'path', { unique: true });
          store.createIndex('updatedAtIndex', 'updatedAt');
        }
      };
    });
  }

  private async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.dbReady;
    }
    if (!this.db) {
      throw new Error('Cơ sở dữ liệu chưa được khởi tạo');
    }
    const transaction = this.db.transaction(this.storeName, mode);
    return transaction.objectStore(this.storeName);
  }

  private addCallback(path: string, callback: Callback) {
    if (!this.callbacks.has(path)) {
      this.callbacks.set(path, new Set());
    }
    this.callbacks.get(path)!.add(callback);
  }

  private removeCallback(path: string, callback: Callback) {
    const callbacks = this.callbacks.get(path);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.callbacks.delete(path);
      }
    }
  }

  get(path: string, callback: Callback): Unsubscribe {
    this.getStore()
      .then((store) => {
        const request = store.get(path);

        request.onsuccess = () => {
          const record = request.result;
          if (record) {
            const { value, updatedAt } = record;
            callback(value, path, updatedAt, () => this.removeCallback(path, callback));
          } else {
            callback(undefined, path, undefined, () => this.removeCallback(path, callback));
          }
        };

        request.onerror = () => {
          console.error('Lỗi đọc dữ liệu từ IndexedDB:', request.error);
          callback(undefined, path, undefined, () => this.removeCallback(path, callback));
        };
      })
      .catch((error) => {
        console.error('Lỗi lấy dữ liệu IndexedDB:', error);
        callback(undefined, path, undefined, () => {});
      });

    this.addCallback(path, callback);
    return () => this.removeCallback(path, callback);
  }

  async set(path: string, value: NodeValue): Promise<void> {
    if (value.updatedAt === undefined) {
      throw new Error(`Giá trị không hợp lệ: ${JSON.stringify(value)}`);
    }

    try {
      const store = await this.getStore('readwrite');
      const record = {
        path,
        value: value.value,
        updatedAt: value.updatedAt,
        expiresAt: value.expiresAt,
      };

      return new Promise((resolve, reject) => {
        const request = store.put(record);

        request.onsuccess = () => {
          const callbacks = this.callbacks.get(path);
          if (callbacks) {
            callbacks.forEach((callback) => {
              callback(value.value, path, value.updatedAt, () =>
                this.removeCallback(path, callback),
              );
            });
          }
          resolve();
        };

        request.onerror = () => {
          console.error('Lỗi ghi dữ liệu vào IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Lỗi đặt giá trị IndexedDB:', error);
      throw error;
    }
  }

  list(path: string, callback: Callback): Unsubscribe {
    this.getStore()
      .then((store) => {
        const index = store.index('pathIndex');
        const range = IDBKeyRange.bound(`${path}/`, `${path}/\uffff`, false, false);

        const request = index.openCursor(range);

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const record = cursor.value;
            const storedPath = record.path;
            const remainingPath = storedPath.replace(`${path}/`, '');

            if (!remainingPath.includes('/')) {
              callback(record.value, storedPath, record.updatedAt, () =>
                this.removeCallback(path, callback),
              );
            }
            cursor.continue();
          }
        };

        request.onerror = () => {
          console.error('Lỗi liệt kê dữ liệu từ IndexedDB:', request.error);
        };
      })
      .catch((error) => {
        console.error('Lỗi danh sách IndexedDB:', error);
      });

    this.addCallback(path, callback);
    return () => this.removeCallback(path, callback);
  }

  /**
   * Xóa bản ghi đã hết hạn; có thể gọi định kỳ để dọn dẹp.
   */
  async cleanup(): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      const now = Date.now();
      const index = store.index('updatedAtIndex');
      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const record = cursor.value;
          if (record.expiresAt && record.expiresAt < now) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Lỗi dọn dẹp IndexedDB:', error);
    }
  }
}
