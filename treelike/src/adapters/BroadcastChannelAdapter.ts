import { Adapter, Callback, NodeValue, Unsubscribe } from '../types';

/**
 * Đồng bộ giữa các tab trình duyệt qua [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel).
 */
export class BroadcastChannelAdapter implements Adapter {
  channel: BroadcastChannel;

  constructor(channelName: string) {
    this.channel = new BroadcastChannel(channelName);
  }

  get(path: string, callback: Callback): Unsubscribe {
    const listener = (event: MessageEvent) => {
      const { path: eventPath, value, updatedAt } = JSON.parse(event.data);
      if (eventPath === path) {
        callback(value, path, updatedAt, () =>
          this.channel.removeEventListener('message', listener),
        );
      }
    };

    this.channel.addEventListener('message', listener);

    return () => this.channel.removeEventListener('message', listener);
  }

  async set(path: string, value: NodeValue) {
    if (value && value.updatedAt === undefined) {
      throw new Error(`Giá trị không hợp lệ: ${JSON.stringify(value)}`);
    }

    const message = JSON.stringify({
      path,
      value: value.value,
      updatedAt: value.updatedAt,
    });

    this.channel.postMessage(message);
  }

  list(path: string, callback: Callback): Unsubscribe {
    const listener = (event: MessageEvent) => {
      const { path: eventPath, value, updatedAt } = JSON.parse(event.data);
      // Trong adapter đơn giản này, đường dẫn được dùng làm tiền tố để xác định nút con.
      if (eventPath.startsWith(`${path}/`)) {
        const childPath = eventPath.substring(path.length + 1);
        if (!childPath.includes('/')) {
          // Chỉ nhận nút con trực tiếp.
          callback(value, childPath, updatedAt, () =>
            this.channel.removeEventListener('message', listener),
          );
        }
      }
    };

    this.channel.addEventListener('message', listener);

    return () => this.channel.removeEventListener('message', listener);
  }
}
