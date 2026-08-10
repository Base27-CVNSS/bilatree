import { Adapters, Node } from '../../treelike/src';
import { PublicKey } from './Hex/PublicKey.ts';
import NDKAdapter from './NDKAdapter';
import { NostrPublish, NostrSubscribe } from './types.ts';

/**
 * Tạo nút trạng thái công khai theo danh sách tác giả được cung cấp.
 * @param authors
 */
const publicState = (
  publish: NostrPublish,
  subscribe: NostrSubscribe,
  authors: string | Array<string | PublicKey>,
) => {
  let pks;
  if (typeof authors === 'string') {
    pks = [new PublicKey(authors)];
  } else {
    pks = authors.map((a) => {
      if (a instanceof PublicKey) {
        return a;
      } else {
        return new PublicKey(a);
      }
    });
  }
  return new Node({
    adapters: [new Adapters.MemoryAdapter(), new NDKAdapter(publish, subscribe, pks)],
  });
};

export default publicState;
