# ⚛️ `treelike-hooks` — React Hooks cho BilaTree

Gói hooks kết nối vòng đời React với Node BilaTree, giúp ứng dụng sử dụng trạng thái local-first hoặc public state bằng API gần với `useState`.

## Cài đặt

```bash
npm install treelike treelike-hooks react
```

Khi dùng Nostr, cài thêm `treelike-nostr`, `nostr-tools` và NDK.

## Hooks

| Hook | Công dụng |
|---|---|
| `useLocalState` | trạng thái bền cục bộ, có thể đồng bộ tab |
| `useNodeState` | đọc/ghi một instance Node |
| `usePublicState` | trạng thái công khai qua adapter Nostr |
| `useAuthors` | chọn danh sách khóa tác giả |

```tsx
import { useLocalState } from 'treelike-hooks';

export function LanguagePicker() {
  const [language, setLanguage] = useLocalState('cai-dat/ngon-ngu', 'vi');
  return <button onClick={() => setLanguage('vi')}>{language}</button>;
}
```

Hook tự đăng ký khi component mount và cần hủy đúng vòng đời khi component unmount. Đọc [API tiếng Việt](../tai-lieu/API_VI.md#react-hooks).

## Giấy phép và nguồn gốc

MIT. Core nguyên bản do Martti Malmi/irislib phát triển; bản tài liệu BilaTree do Long Ngo/Base27-CVNSS phát triển. Xem [NOTICE](../NOTICE.md).
