# 📡 `treelike-nostr` — Adapter Nostr cho BilaTree

Gói này nối mô hình Node/Adapter của BilaTree với NDK và relay Nostr, phục vụ public state nhiều tác giả hoặc nhiều thiết bị.

## Cài đặt

```bash
npm install treelike treelike-nostr nostr-tools \
  @nostr-dev-kit/ndk @nostr-dev-kit/ndk-cache-dexie
```

## Thành phần

| Export | Vai trò |
|---|---|
| `NDKAdapter` | đọc/ghi node thông qua sự kiện Nostr |
| `publicState` | tạo trạng thái công khai theo tác giả và đường dẫn |
| `PublicKey` / `Hex` | chuẩn hóa khóa và biểu diễn hex |

## Nguyên tắc an toàn

- Sự kiện được ký **không đồng nghĩa** nội dung được mã hóa.
- Relay có thể sao chép nội dung và quan sát metadata.
- Không lưu private key dạng rõ trong Web Storage.
- Ứng dụng phải xác thực kiểu dữ liệu nhận từ relay.

Đọc [phần adapter Nostr trong tài liệu kiến trúc](../tai-lieu/KIEN_TRUC.md#ndkadapter).

## Giấy phép và nguồn gốc

MIT. Core nguyên bản do Martti Malmi/irislib phát triển; bản tài liệu BilaTree do Long Ngo/Base27-CVNSS phát triển. Xem [NOTICE](../NOTICE.md).
