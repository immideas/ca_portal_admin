
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PayoutService {

  private apiUrl = `${environment.apiUrl}/payout`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get pending earnings and payout eligibility
  getPendingPayoutSummary(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/pending-summary`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Cash out available earnings
  cashOutNow(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/cash-out`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Get payout history for the logged-in CA
  getMyPayouts(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/list`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Get payout details by ID
  getMyPayoutById(id: string | number): Observable<any> {
    if (!id) {
      throw new Error('Payout ID is required');
    }

    return this.http.post<any>(
      `${this.apiUrl}/get`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }
}
