import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
 constructor() {
    // Registered once, for the lifetime of the app — safe because
    // this.socket is checked with optional chaining (no-op if null)
    window.addEventListener('beforeunload', () => {
      this.socket?.disconnect();
    });
  }

  connect(userId: string | number): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => console.error('Socket error:', err.message));
    this.socket.on('disconnect', (r) => console.log('Socket disconnected:', r));
  }

  onPermissionsUpdated(callback: (data: any) => void): void {
    this.socket?.on('permissions:updated', callback);
  }

  offPermissionsUpdated(): void {
    this.socket?.off('permissions:updated');
  }

  // 👇 NAYA — theme:updated ke liye, permissions wala hi pattern
  onThemeUpdated(callback: (data: any) => void): void {
    this.socket?.on('theme:updated', callback);
  }

  offThemeUpdated(): void {
    this.socket?.off('theme:updated');
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
