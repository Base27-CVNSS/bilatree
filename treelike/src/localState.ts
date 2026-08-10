import { BroadcastChannelAdapter } from './adapters/BroadcastChannelAdapter.ts';
import { LocalStorageMemoryAdapter } from './adapters/LocalStorageMemoryAdapter.ts';
import { Node } from './Node.ts';

const NAME = 'localState';

/**
 * Trạng thái cục bộ dùng localStorage để lưu bền và BroadcastChannel để chia sẻ giữa các tab.
 */
const localState = new Node({
  id: NAME,
  adapters: [new LocalStorageMemoryAdapter(), new BroadcastChannelAdapter(NAME)],
});

export { localState };
