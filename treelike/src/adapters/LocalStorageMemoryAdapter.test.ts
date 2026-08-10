import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Callback, Unsubscribe } from '../types.ts';
import { LocalStorageMemoryAdapter } from './LocalStorageMemoryAdapter.ts';

describe('LocalStorageMemoryAdapter', () => {
  let adapter: LocalStorageMemoryAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageMemoryAdapter();
  });

  describe('get()', () => {
    it('đọc giá trị đã lưu theo đường dẫn', () => {
      const mockCallback: Callback = vi.fn();
      adapter.set('somePath', { value: 'someValue', updatedAt: Date.now() });
      const unsubscribe: Unsubscribe = adapter.get('somePath', mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        'someValue',
        'somePath',
        expect.any(Number),
        expect.any(Function),
      );
      unsubscribe();
    });
  });

  describe('set()', () => {
    it('ghi giá trị vào đường dẫn', async () => {
      await adapter.set('anotherPath', { value: 'newValue', updatedAt: Date.now() });
      const mockCallback: Callback = vi.fn();
      adapter.get('anotherPath', mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        'newValue',
        'anotherPath',
        expect.any(Number),
        expect.any(Function),
      );
    });
  });

  describe('list()', () => {
    it('liệt kê các nút con trực tiếp', () => {
      const mockCallback: Callback = vi.fn();
      adapter.set('parent/child1', { value: 'childValue1', updatedAt: Date.now() });
      adapter.set('parent/child2', { value: 'childValue2', updatedAt: Date.now() });

      const unsubscribe: Unsubscribe = adapter.list('parent', mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        'childValue1',
        'parent/child1',
        expect.any(Number),
        expect.any(Function),
      );

      expect(mockCallback).toHaveBeenCalledWith(
        'childValue2',
        'parent/child2',
        expect.any(Number),
        expect.any(Function),
      );

      unsubscribe();
    });
  });
});
