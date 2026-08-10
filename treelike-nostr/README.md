# 📡 treelike-nostr

Adapter kết nối cây trạng thái `treelike` với mạng [Nostr](https://nostr.com/) thông qua [NDK](https://github.com/nostr-dev-kit/ndk). Gói này cho phép đọc trạng thái theo khóa công khai của tác giả và phát bản cập nhật đã ký đến relay.

```bash
npm install treelike treelike-nostr nostr-tools \
  @nostr-dev-kit/ndk @nostr-dev-kit/ndk-cache-dexie
```

> Không đưa khóa bí mật hoặc dữ liệu riêng tư vào trạng thái công khai. Độ bền dữ liệu phụ thuộc chính sách của relay được chọn.

Xem [kiến trúc và ví dụ tiếng Việt](../README.md).
