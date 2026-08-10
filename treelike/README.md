# 🌳 `treelike` — Core BilaTree

Gói lõi cung cấp `Node`, kiểu dữ liệu JSON và các adapter cục bộ. API công khai được giữ nguyên để tương thích với hệ sinh thái Treelike.

## Cài đặt

```bash
npm install treelike
```

## Ví dụ

```ts
import { Node } from 'treelike';

const root = new Node();
const status = root.get('du-an/bilatree/trang-thai');

const stop = status.on((value) => console.log('Trạng thái:', value));
await status.put('đang hoạt động');
stop();
```

## Export chính

| Export | Vai trò |
|---|---|
| `Node` | điều hướng, ghi và đăng ký node |
| `localState` | node ghép localStorage + BroadcastChannel |
| `Adapters` | Memory, LocalStorage, IndexedDB, BroadcastChannel |
| `DIRECTORY_VALUE` | dấu hiệu node thư mục |
| `isDirectory` | nhận biết dấu thư mục |

Đọc [API tiếng Việt](../tai-lieu/API_VI.md) và [kiến trúc chi tiết](../tai-lieu/KIEN_TRUC.md).

## Giấy phép và nguồn gốc

MIT. Core nguyên bản do Martti Malmi/irislib phát triển; bản tài liệu và trải nghiệm BilaTree do Long Ngo/Base27-CVNSS phát triển. Xem [NOTICE](../NOTICE.md).
