# ⚛️ treelike-hooks

Bộ React hooks cho `treelike` và `treelike-nostr`. Hook giữ component đồng bộ với một nút, tự cập nhật khi adapter phát thay đổi và cung cấp hàm ghi có cách dùng gần với `useState`.

```tsx
import { useLocalState } from 'treelike-hooks';

function BoDem() {
  const [so, setSo] = useLocalState('demo/bo-dem', 0);
  return <button onClick={() => setSo(so + 1)}>Đã bấm {so} lần</button>;
}
```

Xem [README tiếng Việt đầy đủ](../README.md) để phân biệt trạng thái cục bộ, trạng thái công khai và mô hình nhiều tác giả.
