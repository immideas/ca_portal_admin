import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {
  private apiUrl = `${environment.apiUrl}/user-sessions`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getUserSessions(): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/all`, {}, { headers: this.getAuthHeaders() });
  }

  getUserSessionById(id: string | null): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/get`, { id }, { headers: this.getAuthHeaders() });
  }

  getUserSessionBySessionId(sessionId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/session`, { sessionId }, { headers: this.getAuthHeaders() });
  }

  endSpecificSession(sessionId: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${this.apiUrl}/end-session`, { sessionId }, { headers });
  }

  endAllActiveSessions(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/end-all-sessions`, {}, { headers: this.getAuthHeaders() });
  }
}
