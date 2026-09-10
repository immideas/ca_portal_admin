import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RedirectStateService {
  private payload: any = null;

  set(data: any): void {
    this.payload = data;
  }

 
  consume(): any {
    const data = this.payload;
    this.payload = null;
    return data;
  }
}