/**
 * 联机网络层 - WebRTC P2P (PeerJS)
 * 星型拓扑：主机维护权威状态，客机转发操作
 */

const Net = {
  peer: null,
  isHost: false,
  isOnline: false,
  roomCode: null,
  myPeerId: null,
  myPlayerIdx: -1,

  // 主机：客机连接列表  peerId -> { conn, playerIdx, name }
  guests: {},

  // 客机：到主机的连接
  hostConn: null,

  // 回调
  onMessage: null,
  onGuestJoined: null,
  onGuestLeft: null,
  onConnected: null,
  onError: null,

  /**
   * 生成6位房间号
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  },

  /**
   * 主机：创建房间
   */
  hostRoom() {
    this.isHost = true;
    this.isOnline = true;
    this.guests = {};

    this.roomCode = this.generateRoomCode();
    this.peer = new Peer('kszd-' + this.roomCode, {
      debug: 1
    });

    this.peer.on('open', (id) => {
      this.myPeerId = id;
      console.log('房间已创建: ' + this.roomCode);
      if (this.onConnected) this.onConnected();
    });

    this.peer.on('connection', (conn) => {
      this._setupHostConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'unavailable-id') {
        if (this.onError) this.onError('房间号已被占用，请重试');
      } else {
        if (this.onError) this.onError(err.message || '网络错误');
      }
    });
  },

  /**
   * 主机：处理客机连接
   */
  _setupHostConnection(conn) {
    conn.on('open', () => {
      console.log('客机已连接: ' + conn.peer);
    });

    conn.on('data', (data) => {
      if (data.type === 'join') {
        const guestInfo = {
          conn: conn,
          playerIdx: -1,
          name: data.name || '玩家',
          peerId: conn.peer
        };
        this.guests[conn.peer] = guestInfo;
        if (this.onGuestJoined) this.onGuestJoined(guestInfo);
      } else {
        if (this.onMessage) this.onMessage(data, conn.peer);
      }
    });

    conn.on('close', () => {
      const guest = this.guests[conn.peer];
      if (guest) {
        delete this.guests[conn.peer];
        if (this.onGuestLeft) this.onGuestLeft(guest);
      }
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  },

  /**
   * 客机：加入房间
   */
  joinRoom(code, name) {
    this.isHost = false;
    this.isOnline = true;
    this.roomCode = code.toUpperCase();

    this.peer = new Peer({
      debug: 1
    });

    this.peer.on('open', (id) => {
      this.myPeerId = id;
      console.log('正在连接房间: ' + this.roomCode);

      const conn = this.peer.connect('kszd-' + this.roomCode, {
        reliable: true
      });

      this._setupGuestConnection(conn, name);
    });

    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        if (this.onError) this.onError('房间不存在或已关闭');
      } else {
        if (this.onError) this.onError(err.message || '网络错误');
      }
    });
  },

  /**
   * 客机：设置到主机的连接
   */
  _setupGuestConnection(conn, name) {
    conn.on('open', () => {
      this.hostConn = conn;
      console.log('已连接到主机');

      conn.send({
        type: 'join',
        name: name || '玩家'
      });

      if (this.onConnected) this.onConnected();
    });

    conn.on('data', (data) => {
      if (this.onMessage) this.onMessage(data);
    });

    conn.on('close', () => {
      console.log('与主机断开连接');
      this.hostConn = null;
      if (this.onError) this.onError('与主机断开连接');
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  },

  /**
   * 主机：广播消息给所有客机
   */
  broadcast(data) {
    if (!this.isHost) return;
    for (const peerId in this.guests) {
      const guest = this.guests[peerId];
      if (guest.conn && guest.conn.open) {
        guest.conn.send(data);
      }
    }
  },

  /**
   * 主机：定向发送给某个客机
   */
  sendTo(peerId, data) {
    if (!this.isHost) return;
    const guest = this.guests[peerId];
    if (guest && guest.conn && guest.conn.open) {
      guest.conn.send(data);
    }
  },

  /**
   * 主机：按玩家索引发送
   */
  sendToPlayer(playerIdx, data) {
    if (!this.isHost) return;
    for (const peerId in this.guests) {
      if (this.guests[peerId].playerIdx === playerIdx) {
        this.sendTo(peerId, data);
        return;
      }
    }
  },

  /**
   * 客机：发送消息给主机
   */
  sendToHost(data) {
    if (this.isHost || !this.hostConn) return;
    if (this.hostConn.open) {
      this.hostConn.send(data);
    }
  },

  /**
   * 主机：分配玩家索引给客机
   */
  assignPlayerIdx(peerId, playerIdx) {
    if (this.guests[peerId]) {
      this.guests[peerId].playerIdx = playerIdx;
      this.sendTo(peerId, {
        type: 'assign',
        playerIdx: playerIdx
      });
    }
  },

  /**
   * 获取已连接客机数量
   */
  getGuestCount() {
    return Object.keys(this.guests).length;
  },

  /**
   * 获取客机列表（名称）
   */
  getGuestNames() {
    return Object.values(this.guests).map(g => g.name);
  },

  /**
   * 断开所有连接
   */
  disconnect() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.guests = {};
    this.hostConn = null;
    this.isOnline = false;
    this.isHost = false;
    this.roomCode = null;
    this.myPlayerIdx = -1;
  }
};
