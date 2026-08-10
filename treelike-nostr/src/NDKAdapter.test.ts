import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Callback, Unsubscribe } from '../../treelike/src';
import { NDKAdapter, PublicKey } from '.';
import { NostrEvent, NostrFilter, NostrPublish, NostrSubscribe } from './types';

type Subscription = {
  filter: NostrFilter;
  onEvent: (event: NostrEvent) => void;
};

const matchesFilter = (event: NostrEvent, filter: NostrFilter) => {
  if (filter.authors?.length && !filter.authors.includes(event.pubkey)) return false;
  if (filter.kinds?.length && !filter.kinds.includes(event.kind)) return false;
  if (filter['#d']?.length) {
    const dTag = event.tags.find((tag) => tag[0] === 'd')?.[1];
    if (!dTag || !filter['#d'].includes(dTag)) return false;
  }
  return true;
};

describe('NDKAdapter', () => {
  let adapter: NDKAdapter;
  let author: PublicKey;
  let events: NostrEvent[];
  let subscriptions: Subscription[];

  beforeEach(() => {
    author = new PublicKey(getPublicKey(generateSecretKey()));
    events = [];
    subscriptions = [];

    // Bus sự kiện xác định giúp kiểm thử hợp đồng adapter mà không phụ thuộc relay công cộng.
    const publish: NostrPublish = (partial) => {
      const event: NostrEvent = {
        id: `test-${events.length + 1}`,
        pubkey: author.value,
        created_at: partial.created_at ?? Math.floor(Date.now() / 1000),
        kind: partial.kind ?? 30078,
        tags: partial.tags ?? [],
        content: partial.content ?? '',
        sig: 'test-signature',
      };
      events.push(event);
      subscriptions.forEach(({ filter, onEvent }) => {
        if (matchesFilter(event, filter)) onEvent(event);
      });
    };

    const subscribe: NostrSubscribe = (filter, onEvent) => {
      const subscription = { filter, onEvent };
      subscriptions.push(subscription);
      events.forEach((event) => {
        if (matchesFilter(event, filter)) onEvent(event);
      });
      return () => {
        subscriptions = subscriptions.filter((item) => item !== subscription);
      };
    };

    adapter = new NDKAdapter(publish, subscribe, [author]);
  });

  it('đọc giá trị đã lưu theo đúng đường dẫn và tác giả', async () => {
    const callback: Callback = vi.fn();
    await adapter.set('somePath', { value: 'someValue', updatedAt: Date.now() });
    const unsubscribe: Unsubscribe = adapter.get('somePath', callback);

    expect(callback).toHaveBeenCalledWith(
      'someValue',
      `${author.npub}somePath`,
      expect.any(Number),
      expect.any(Function),
    );
    unsubscribe();
  });

  it('phát giá trị mới qua hàm publish', async () => {
    await adapter.set('anotherPath', { value: 'newValue', updatedAt: Date.now() });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 30078,
      content: JSON.stringify('newValue'),
      tags: [
        ['d', 'anotherPath'],
        ['f', ''],
      ],
    });
  });

  it('liệt kê riêng các nút con trực tiếp', async () => {
    const callback: Callback = vi.fn();
    await adapter.set('parent/child1', { value: 'childValue1', updatedAt: Date.now() });
    await adapter.set('parent/child2', { value: 'childValue2', updatedAt: Date.now() });
    await adapter.set('parent/nested/grandchild', {
      value: 'không phải con trực tiếp',
      updatedAt: Date.now(),
    });

    const unsubscribe: Unsubscribe = adapter.list('parent', callback);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith(
      'childValue1',
      `${author.npub}parent/child1`,
      expect.any(Number),
      expect.any(Function),
    );
    expect(callback).toHaveBeenCalledWith(
      'childValue2',
      `${author.npub}parent/child2`,
      expect.any(Number),
      expect.any(Function),
    );
    unsubscribe();
  });
});
