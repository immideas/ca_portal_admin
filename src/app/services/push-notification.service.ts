import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';        

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private API = 'http://localhost:5000/api';

  constructor(private swPush: SwPush, private http: HttpClient) { }

  getPublicKey() {
    return this.http.get<{ publicKey: string }>(`${this.API}/vapid-public-key`);
  }

  async subscribeToNotifications(): Promise<void> {
    if (!this.swPush.isEnabled) {
      console.warn('Service Worker not enabled. Build with --configuration production.');
      return;
    }

    try {
      const { publicKey } = await firstValueFrom(this.getPublicKey());

      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: publicKey
      });

      await firstValueFrom(
        this.http.post(`${this.API}/subscribe`, subscription)
      );
      console.log('✅ Push subscription saved to server!');

    } catch (err) {
      console.error('❌ Could not subscribe to push notifications:', err);
      throw err; 
    }
  }

  async unsubscribeFromNotifications(): Promise<void> {
    try {
      await this.swPush.unsubscribe();
      console.log('✅ Unsubscribed from push notifications');
    } catch (err) {
      console.error('❌ Could not unsubscribe:', err);
    }
  }

  sendNotification(title: string, body: string, url = '/') {
    return this.http.post(`${this.API}/send-notification`, {
      title,
      body,
      url,
      icon: '/assets/icons/icon-72x72.png'
    });
  }

  listenForMessages() {
    return this.swPush.messages; 
  }

  listenForClicks() {
    return this.swPush.notificationClicks; 
  }

  get isSubscribed(): boolean {
    return this.swPush.isEnabled;
  }
}