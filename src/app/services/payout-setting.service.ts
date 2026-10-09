import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PayoutSettingService {

  private apiUrl = `${environment.apiUrl}/payout-settings`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Create payout settings
  createPayoutSetting(data: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/create`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  // Update payout settings
  updatePayoutSetting(data: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/update`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  // Get payout settings for the logged-in user
  getPayoutSetting(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/get`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Get payout settings by ID
  getPayoutSettingById(id: string | number): Observable<any> {
    if (!id) {
      throw new Error('Payout Setting ID is required');
    }

    return this.http.post<any>(
      `${this.apiUrl}/getById`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  // List payout settings with pagination
  listAllPayoutSettings(payload: any = {}): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/list`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  // Register bank/UPI details with RazorpayX
  registerPayoutSetting(id?: string | number): Observable<any> {
    const payload = id ? { id } : {};

    return this.http.post(
      `${this.apiUrl}/register`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  // Disable payout settings
  deletePayoutSetting(id: string | number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/delete`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  // Enable payout settings
  enablePayoutSetting(id: string | number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/enable`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }
}