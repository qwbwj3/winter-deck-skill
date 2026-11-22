// 零 npm 依赖的本机 CDP WebSocket；不用于连接外部网站。
import { request } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
export class LocalWebSocket extends EventTarget {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  readyState = 0;
  constructor(address) {
    super();
    const url = new URL(address);
    if (url.protocol !== 'ws:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('CDP 仅接受本机 ws 地址');
    this.buffer = Buffer.alloc(0); this.fragments = []; this.fragmenting = false;
    const key = randomBytes(16).toString('base64');
    this.req = request(url.href.replace(/^ws:/, 'http:'), { headers: {
      Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13',
    } });
    this.req.on('upgrade', (response, socket, head) => {
      const expected = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
      if (this.readyState !== 0) { socket.destroy(); return; }
      if (response.headers['sec-websocket-accept'] !== expected || response.headers.upgrade?.toLowerCase() !== 'websocket') {
        socket.destroy(); this.fail(new Error('CDP WebSocket 握手失败')); return;
      }
      this.socket = socket; this.readyState = 1;
      socket.on('data', (chunk) => this.receive(chunk));
      socket.on('error', (error) => this.fail(error));
      socket.on('close', () => this.closed());
      this.dispatchEvent(new Event('open'));
      if (head.length) this.receive(head);
    });
    this.req.on('response', (response) => { response.resume(); this.fail(new Error('CDP 未升级为 WebSocket')); });
    this.req.on('error', (error) => { if (this.readyState < 2) this.fail(error); });
    this.req.end();
  }
  closed() {
    if (this.readyState === 3) return;
    this.readyState = 3; clearTimeout(this.closeTimer); this.dispatchEvent(new Event('close'));
  }
  fail(error) {
    if (this.readyState === 3) return;
    this.dispatchEvent(Object.assign(new Event('error'), { error }));
    this.socket?.destroy(); this.req?.destroy(); this.closed();
  }
  frame(opcode, payload) {
    const n = payload.length, extra = n < 126 ? 0 : n <= 65535 ? 2 : 8;
    const header = Buffer.alloc(2 + extra + 4), mask = randomBytes(4);
    header[0] = 0x80 | opcode; header[1] = 0x80 | (extra === 0 ? n : extra === 2 ? 126 : 127);
    if (extra === 2) header.writeUInt16BE(n, 2);
    if (extra === 8) header.writeBigUInt64BE(BigInt(n), 2);
    mask.copy(header, 2 + extra);
    const bytes = Buffer.from(payload);
    for (let i = 0; i < n; i++) bytes[i] ^= mask[i % 4];
    this.socket.write(Buffer.concat([header, bytes]));
  }
  send(text) {
    if (this.readyState !== 1) throw new Error('CDP WebSocket 尚未连接');
    this.frame(1, Buffer.from(text));
  }
  receive(chunk) {
    try {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      while (this.buffer.length >= 2) {
        const b = this.buffer, fin = !!(b[0] & 0x80), opcode = b[0] & 15, masked = !!(b[1] & 0x80);
        if (b[0] & 0x70 || masked) throw new Error('CDP WebSocket 帧格式无效');
        let size = b[1] & 127, offset = 2;
        if (size === 126) { if (b.length < 4) return; size = b.readUInt16BE(2); offset = 4; }
        if (size === 127) {
          if (b.length < 10) return;
          const length = b.readBigUInt64BE(2);
          if (length > 64n * 1024n * 1024n) throw new Error('CDP 消息过大');
          size = Number(length); offset = 10;
        }
        if (opcode >= 8 && (!fin || size > 125)) throw new Error('CDP 控制帧格式无效');
        if (b.length < offset + size) return;
        const payload = b.subarray(offset, offset + size); this.buffer = b.subarray(offset + size);
        if (opcode === 8) { if (this.readyState === 1) this.frame(8, payload); this.readyState = 2; this.socket.end(); return; }
        if (opcode === 9) { this.frame(10, payload); continue; }
        if (opcode === 10) continue;
        if (opcode === 1 && !this.fragmenting) { this.fragments = []; this.fragmenting = true; }
        else if (opcode !== 0 || !this.fragmenting) throw new Error('CDP 只接受有效文本消息');
        this.fragments.push(payload);
        if (this.fragments.reduce((n, p) => n + p.length, 0) > 64 * 1024 * 1024) throw new Error('CDP 消息过大');
        if (fin) {
          const data = Buffer.concat(this.fragments).toString('utf8'); this.fragments = []; this.fragmenting = false;
          this.dispatchEvent(Object.assign(new Event('message'), { data }));
        }
      }
    } catch (error) { this.fail(error); }
  }
  close() {
    if (this.readyState >= 2) return;
    if (this.readyState === 0) { this.readyState = 2; this.req.destroy(); this.closed(); return; }
    this.frame(8, Buffer.alloc(0)); this.readyState = 2;
    this.closeTimer = setTimeout(() => { this.socket.destroy(); this.closed(); }, 1000);
    this.closeTimer.unref();
  }
}
