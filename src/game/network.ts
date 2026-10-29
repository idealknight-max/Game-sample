import { ChatMessage, KillfeedEntry, WeaponId } from '../types/game';

export interface NetworkPacket {
  type: 'JOIN' | 'UPDATE' | 'SHOOT' | 'HIT' | 'KILL' | 'CHAT' | 'LEAVE';
  senderId: string;
  senderName: string;
  payload: any;
}

export interface RemotePlayer {
  id: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
  pitch: number;
  weapon: WeaponId;
  health: number;
  armor: number;
  isShooting: boolean;
  isCrouching: boolean;
  color: string;
  kills: number;
  deaths: number;
  lastSeen: number;
}

export class NetworkManager {
  private channel: BroadcastChannel | null = null;
  public playerId: string;
  public playerName: string;
  public playerColor: string;
  public remotePlayers: Map<string, RemotePlayer> = new Map();
  private onKillfeedCallback?: (entry: KillfeedEntry) => void;
  private onChatCallback?: (chat: ChatMessage) => void;
  private onRemoteShootCallback?: (senderId: string, weapon: WeaponId, origin: [number, number, number], dir: [number, number, number]) => void;
  private onDamageReceivedCallback?: (damage: number, attackerName: string, isHeadshot: boolean) => void;

  constructor() {
    this.playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    this.playerName = 'Operator_' + Math.floor(100 + Math.random() * 900);
    const colors = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#f472b6'];
    this.playerColor = colors[Math.floor(Math.random() * colors.length)];

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('polyzone_net_channel');
        this.channel.onmessage = this.handleMessage.bind(this);
      } catch (e) {
        console.warn('BroadcastChannel not supported in this context', e);
      }
    }
  }

  public setCallbacks(callbacks: {
    onKillfeed: (entry: KillfeedEntry) => void;
    onChat: (chat: ChatMessage) => void;
    onRemoteShoot: (senderId: string, weapon: WeaponId, origin: [number, number, number], dir: [number, number, number]) => void;
    onDamageReceived: (damage: number, attackerName: string, isHeadshot: boolean) => void;
  }) {
    this.onKillfeedCallback = callbacks.onKillfeed;
    this.onChatCallback = callbacks.onChat;
    this.onRemoteShootCallback = callbacks.onRemoteShoot;
    this.onDamageReceivedCallback = callbacks.onDamageReceived;
  }

  public broadcastJoin() {
    this.send({
      type: 'JOIN',
      senderId: this.playerId,
      senderName: this.playerName,
      payload: {
        color: this.playerColor,
      },
    });
  }

  public broadcastUpdate(data: {
    position: [number, number, number];
    rotationY: number;
    pitch: number;
    weapon: WeaponId;
    health: number;
    armor: number;
    isShooting: boolean;
    isCrouching: boolean;
    kills: number;
    deaths: number;
  }) {
    this.send({
      type: 'UPDATE',
      senderId: this.playerId,
      senderName: this.playerName,
      payload: data,
    });
  }

  public broadcastShoot(origin: [number, number, number], dir: [number, number, number], weapon: WeaponId) {
    this.send({
      type: 'SHOOT',
      senderId: this.playerId,
      senderName: this.playerName,
      payload: { origin, dir, weapon },
    });
  }

  public broadcastDamageDealt(victimId: string, damage: number, isHeadshot: boolean) {
    this.send({
      type: 'HIT',
      senderId: this.playerId,
      senderName: this.playerName,
      payload: { victimId, damage, isHeadshot },
    });
  }

  public broadcastKill(victimName: string, weapon: WeaponId, isHeadshot: boolean) {
    const entry: KillfeedEntry = {
      id: 'kill_' + Date.now() + '_' + Math.random(),
      killer: this.playerName,
      victim: victimName,
      weapon,
      isHeadshot,
      timestamp: Date.now(),
    };
    this.send({
      type: 'KILL',
      senderId: this.playerId,
      senderName: this.playerName,
      payload: entry,
    });
    if (this.onKillfeedCallback) {
      this.onKillfeedCallback(entry);
    }
  }

  public sendChat(text: string) {
    const chat: ChatMessage = {
      id: 'chat_' + Date.now(),
      sender: this.playerName,
      text,
      timestamp: Date.now(),
    };
    this.send({
      type: 'CHAT',
      senderId: this.playerId,
      senderName: this.playerName,
      payload: chat,
    });
    if (this.onChatCallback) {
      this.onChatCallback(chat);
    }
  }

  public disconnect() {
    this.send({
      type: 'LEAVE',
      senderId: this.playerId,
      senderName: this.playerName,
      payload: {},
    });
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  private send(packet: NetworkPacket) {
    if (this.channel) {
      try {
        this.channel.postMessage(packet);
      } catch (err) {
        // channel closed or busy
      }
    }
  }

  private handleMessage(ev: MessageEvent<NetworkPacket>) {
    const packet = ev.data;
    if (!packet || packet.senderId === this.playerId) return;

    const now = Date.now();

    switch (packet.type) {
      case 'JOIN': {
        this.remotePlayers.set(packet.senderId, {
          id: packet.senderId,
          name: packet.senderName,
          position: [0, 0, 0],
          rotationY: 0,
          pitch: 0,
          weapon: 'assault',
          health: 100,
          armor: 50,
          isShooting: false,
          isCrouching: false,
          color: packet.payload?.color || '#38bdf8',
          kills: 0,
          deaths: 0,
          lastSeen: now,
        });
        // Respond with our own presence
        this.broadcastJoin();
        break;
      }

      case 'UPDATE': {
        let player = this.remotePlayers.get(packet.senderId);
        if (!player) {
          player = {
            id: packet.senderId,
            name: packet.senderName,
            position: packet.payload.position,
            rotationY: packet.payload.rotationY,
            pitch: packet.payload.pitch,
            weapon: packet.payload.weapon,
            health: packet.payload.health,
            armor: packet.payload.armor,
            isShooting: packet.payload.isShooting,
            isCrouching: packet.payload.isCrouching,
            color: '#38bdf8',
            kills: packet.payload.kills,
            deaths: packet.payload.deaths,
            lastSeen: now,
          };
          this.remotePlayers.set(packet.senderId, player);
        } else {
          player.position = packet.payload.position;
          player.rotationY = packet.payload.rotationY;
          player.pitch = packet.payload.pitch;
          player.weapon = packet.payload.weapon;
          player.health = packet.payload.health;
          player.armor = packet.payload.armor;
          player.isShooting = packet.payload.isShooting;
          player.isCrouching = packet.payload.isCrouching;
          player.kills = packet.payload.kills;
          player.deaths = packet.payload.deaths;
          player.lastSeen = now;
        }
        break;
      }

      case 'SHOOT': {
        if (this.onRemoteShootCallback) {
          this.onRemoteShootCallback(packet.senderId, packet.payload.weapon, packet.payload.origin, packet.payload.dir);
        }
        break;
      }

      case 'HIT': {
        if (packet.payload.victimId === this.playerId) {
          if (this.onDamageReceivedCallback) {
            this.onDamageReceivedCallback(packet.payload.damage, packet.senderName, packet.payload.isHeadshot);
          }
        }
        break;
      }

      case 'KILL': {
        if (this.onKillfeedCallback) {
          this.onKillfeedCallback(packet.payload);
        }
        break;
      }

      case 'CHAT': {
        if (this.onChatCallback) {
          this.onChatCallback(packet.payload);
        }
        break;
      }

      case 'LEAVE': {
        this.remotePlayers.delete(packet.senderId);
        break;
      }
    }
  }

  public purgeStalePlayers() {
    const timeout = 6000; // 6 seconds
    const now = Date.now();
    for (const [id, player] of this.remotePlayers.entries()) {
      if (now - player.lastSeen > timeout) {
        this.remotePlayers.delete(id);
      }
    }
  }
}

export const networkManager = new NetworkManager();
