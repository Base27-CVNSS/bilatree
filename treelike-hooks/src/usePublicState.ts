import { useMemo } from 'react';

import { JsonValue } from '../../treelike/src';
import { publicState } from '../../treelike-nostr/src';
import { NostrPublish, NostrSubscribe } from '../../treelike-nostr/src/types';
import { useGroupNodeState, useNodeState } from './useNodeState.ts';

/**
 * React hook lấy một nút trạng thái công khai theo danh sách tác giả; cách dùng gần với React useState.
 *
 * Hook yêu cầu peer dependency treelike-nostr.
 *
 * @param authors
 * @param path
 * @param initialValue
 */
export function usePublicState<T = JsonValue>(
  publish: NostrPublish,
  subscribe: NostrSubscribe,
  authors: string[],
  path: string,
  initialValue: T,
  typeGuard?: (value: JsonValue) => T,
  recursion = 1,
) {
  const node = useMemo(() => publicState(publish, subscribe, authors), [authors]);
  return useNodeState<T>(node, path, initialValue, typeGuard, false, recursion);
}

/**
 * Lấy riêng giá trị nút của từng tác giả và trả về Map từ tác giả đến giá trị.
 * @param authors
 * @param path
 * @param typeGuard
 * @param recursion
 */
export function usePublicGroupState<T = JsonValue>(
  publish: NostrPublish,
  subscribe: NostrSubscribe,
  authors: string[],
  path: string,
  typeGuard?: (value: JsonValue) => T,
  recursion = 1,
) {
  const node = useMemo(() => publicState(publish, subscribe, authors), [authors]);
  return useGroupNodeState<T>(node, path, typeGuard, false, recursion);
}
