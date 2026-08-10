# 🧩 API BilaTree bằng tiếng Việt

Tài liệu này là bản đồ tra cứu nhanh. Tên hàm TypeScript được giữ nguyên để tương thích với package gốc.

## `Node`

### Khởi tạo

```ts
import { Node } from 'treelike';

const root = new Node();
const custom = new Node({ id: 'ung-dung', adapters: [adapterA, adapterB] });
```

| Thuộc tính `NodeProps` | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | `string` | `''` | địa chỉ của node |
| `adapters` | `Adapter[]` | adapter local mặc định | nơi đọc/ghi dữ liệu |
| `parent` | `Node \| null` | `null` | node cha; node con kế thừa adapter |

### `get(key)`

Lấy hoặc tạo node con theo một segment hoặc cả đường dẫn.

```ts
const title = root.get('ung-dung/tai-lieu/tieu-de');
```

| Đầu vào | Đầu ra |
|---|---|
| `key: string` | `Node` |

### `put(value, updatedAt?, expiresAt?)`

Ghi giá trị vào node. Object không rỗng được tách thành các node con.

```ts
await title.put('BilaTree', Date.now());
await root.get('ho-so').put({ ten: 'Long Ngo', ngonNgu: 'vi-VN' });
```

| Tham số | Kiểu | Ghi chú |
|---|---|---|
| `value` | `JsonValue` | giá trị JSON |
| `updatedAt` | `number` | mặc định `Date.now()` |
| `expiresAt` | `number` | thời điểm hết hạn tùy chọn |

### `on(callback, returnIfUndefined?, recursion?, typeGuard?, latestOnly?)`

Đăng ký thay đổi tại node.

```ts
const stop = title.on((value, path, updatedAt) => {
  console.log(value, path, updatedAt);
});

stop();
```

| Tham số | Mặc định | Ý nghĩa |
|---|---:|---|
| `callback` | bắt buộc | nhận giá trị, đường dẫn, thời gian, hàm hủy |
| `returnIfUndefined` | `false` | có gọi callback khi chưa có giá trị không |
| `recursion` | `1` | độ sâu mở thư mục |
| `typeGuard` | ép kiểu mặc định | kiểm tra/chuyển kiểu runtime |
| `latestOnly` | `true` | chỉ nhận bản mới nhất theo thời gian |

Trả về `Unsubscribe`.

### `forEach(callback, recursion?, typeGuard?)`

Đăng ký riêng từng node con.

```ts
const stop = root.get('tai-lieu').forEach((value, path) => {
  console.log(path, value);
});
```

### `open(callback, recursion?, typeGuard?)`

Tổng hợp các node con thành object và gọi callback khi object thay đổi.

```ts
root.get('ho-so').open((profile) => console.log(profile));
```

## Hằng và hàm hỗ trợ

| Export | Công dụng |
|---|---|
| `DIRECTORY_VALUE` | object rỗng biểu thị node thư mục |
| `isDirectory(value)` | kiểm tra giá trị có phải dấu thư mục |
| `localState` | node dựng sẵn với localStorage + BroadcastChannel |

## Interface `Adapter`

Một adapter tối thiểu cần thực hiện:

```ts
interface Adapter {
  get(path: string, callback: Callback): Unsubscribe;
  set(path: string, value: NodeValue): Promise<void>;
  list(path: string, callback: Callback): Unsubscribe;
}
```

| Hàm | Trách nhiệm |
|---|---|
| `get` | đọc/đăng ký một đường dẫn |
| `set` | lưu hoặc phát một `NodeValue` |
| `list` | liệt kê/đăng ký các node con trực tiếp |

## React Hooks

### `useLocalState(path, initialValue)`

Trạng thái local-first có API gần giống `useState`.

```tsx
const [language, setLanguage] = useLocalState('cai-dat/ngon-ngu', 'vi');
```

### `useNodeState(node, initialValue)`

Kết nối component với một instance `Node` cụ thể.

```tsx
const [profile, setProfile] = useNodeState(profileNode, {});
```

### `usePublicState(authors, path, initialValue)`

Đọc/ghi public state qua adapter Nostr.

```tsx
const [title, setTitle] = usePublicState(authors, 'tai-lieu/tieu-de', 'Chưa đặt tên');
```

### `useAuthors(path)`

Trả về danh sách tác giả/khóa công khai dùng làm phạm vi đọc public state.

## Kiểu callback

Callback có mô hình:

```ts
type Callback<T = JsonValue> = (
  value: T,
  path: string,
  updatedAt?: number,
  unsubscribe?: Unsubscribe,
) => void;
```

## Quy ước sử dụng an toàn

1. Chuẩn hóa đường dẫn, không để segment rỗng.
2. Dùng type guard hoặc schema runtime cho dữ liệu không tin cậy.
3. Giữ và gọi `unsubscribe` khi component/dịch vụ kết thúc.
4. Không đưa secret chưa mã hóa vào adapter mạng.
5. Không giả định `updatedAt` giải quyết mọi kiểu xung đột.

---

Quay lại [README chính](../README.md) · Đọc [kiến trúc](KIEN_TRUC.md)
