import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  headers!: HttpHeaders;

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService
  ) {}

  private setHeader() {
    this.headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${
        this.authService.currentToken || localStorage.getItem('token')
      }`
    });
  }

  createRazorpayOrder(data: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/payments/createOrder`,
      data,
      { headers: this.headers }
    ).pipe(retry(1));
  }

  createSubscription(data: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/payments/createSubscription`,
      data,
      { headers: this.headers }
    ).pipe(retry(1));
  }

  verifyPayment(data: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/payments/verifyPayment`,
      data,
      { headers: this.headers }
    ).pipe(retry(1));
  }

  getPaymentHistory(data: any = {}) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/payments/getPaymentHistory`,
      data,
      { headers: this.headers }
    ).pipe(retry(1));
  }

  getSubscriptionStatus() {
    this.setHeader();
    return this.httpClient.get<any>(
      `${environment.apiUrl}/payments/subscription-status`,
      { headers: this.headers }
    ).pipe(retry(1));
  }
getPaymentDetails(data: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/payments/getPaymentDetails`,
      data,
      { headers: this.headers }
    ).pipe(retry(1));
  }
}