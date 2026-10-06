import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminConfigService {

  private apiUrl = `${environment.apiUrl}/admin-config`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // =========================================================
  // GET ADMIN CONFIG
  // =========================================================

  getAdminConfig(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/get`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  // =========================================================
  // SAVE ADMIN CONFIG
  // =========================================================

  saveAdminConfig(config: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/save`,
      config,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

}