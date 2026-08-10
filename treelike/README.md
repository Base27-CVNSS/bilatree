# 🌳 treelike — lõi BilaTree

`treelike` là cấu trúc dữ liệu dạng cây có các nút đăng ký được. Bạn đọc/ghi bằng đường dẫn, còn adapter đảm nhiệm việc lưu trữ và phát thay đổi.

```bash
npm install treelike
```

```ts
import { localState } from 'treelike';

const node = localState.get('cau-hinh/giao-dien');
const huy = node.on((value) => console.log('Đã đổi:', value));

await node.put({ cheDo: 'toi', ngonNgu: 'vi' });
huy();
```

Gói lõi cung cấp `Node`, `localState` và các adapter Memory, LocalStorage, IndexedDB, BroadcastChannel. Thiết kế được lấy cảm hứng từ [GunDB](https://github.com/amark/gun) nhưng không phải bản sao của một cơ sở dữ liệu đồ thị đầy đủ.

Xem [README tiếng Việt đầy đủ](../README.md) và [phòng thử BilaTree](https://base27-cvnss.github.io/bilatree/).
