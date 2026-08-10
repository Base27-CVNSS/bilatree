import { useEffect, useMemo, useState } from 'react';

import { Hex, PublicKey, publicState } from '../../treelike-nostr/src';
import { NostrEvent, NostrPublish, NostrSubscribe } from '../../treelike-nostr/src/types';
import { useLocalState } from './useLocalState';

/**
 * React hook lấy mảng khóa công khai của các tác giả.
 * @param ownerOrGroup khóa công khai của chủ sở hữu, hoặc 'follows' để lấy những tác giả người dùng đang theo dõi
 * @param groupPath đường dẫn chứa danh sách tác giả, ví dụ 'ung-dung/tai-lieu/tai-lieu-1/tac-gia'
 */
export function useAuthors(
  publish: NostrPublish,
  subscribe: NostrSubscribe,
  ownerOrGroup?: string,
  groupPath?: string,
): string[] {
  const [myPubKey] = useLocalState('user/publicKey', '');
  const initialAuthors = useMemo((): string[] => {
    if (!ownerOrGroup) return [];
    if (ownerOrGroup === 'follows') {
      return myPubKey ? [String(myPubKey)] : [];
    } else {
      const k = new PublicKey(ownerOrGroup);
      return [k.toString()];
    }
  }, [myPubKey, ownerOrGroup]);
  const [authors, setAuthors] = useState<Set<string>>(new Set(initialAuthors));

  useEffect(() => {
    if (myPubKey && ownerOrGroup === 'follows') {
      const unsub = subscribe({ kinds: [3], authors: [String(myPubKey)] }, (event: NostrEvent) => {
        if (event.kind === 3) {
          const newAuthors = new Set([String(myPubKey)]);
          let updated = false;
          event.tags.forEach((tag: string[]) => {
            if (tag[0] === 'p') {
              try {
                new Hex(tag[1], 64);
                if (!newAuthors.has(tag[1])) {
                  newAuthors.add(tag[1]);
                  updated = true;
                }
              } catch (e) {
                console.error('Khóa công khai không hợp lệ', tag[1]);
              }
            }
          });
          if (updated) setAuthors(newAuthors);
        }
      });
      return () => unsub();
    }
  }, [ownerOrGroup, myPubKey]);

  useEffect(() => {
    const initialSet = new Set(initialAuthors);
    if (
      !authors ||
      Array.from(authors).sort().toString() !== Array.from(initialSet).sort().toString()
    ) {
      setAuthors(initialSet);
    }

    if (!ownerOrGroup || ownerOrGroup === 'follows') return;
    if (groupPath) {
      return publicState(publish, subscribe, ownerOrGroup)
        .get(groupPath)
        .forEach(
          (isInGroup: boolean | undefined, path: string) => {
            setAuthors((prev) => {
              const key = path.split('/').pop()!;
              const newAuthors = new Set(prev);
              const alreadyHave = newAuthors.has(key);
              if (isInGroup && !alreadyHave) {
                newAuthors.add(key);
                return newAuthors;
              } else if (!isInGroup && alreadyHave) {
                newAuthors.delete(key);
                return newAuthors;
              }
              return prev;
            });
          },
          0,
          Boolean,
        );
    }
  }, [ownerOrGroup, groupPath, initialAuthors]);

  const arr = useMemo(() => Array.from(authors), [authors]);

  return arr;
}
