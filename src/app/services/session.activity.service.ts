import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionActivityService {
  private apiUrl = `${environment.apiUrl}/session-activities`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  logPageVisit(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/log-each-route`, data, { headers: this.getAuthHeaders() });
  }

  getSessionActivitiesBySessionId(sessionId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/get-by-session-id`, { sessionId }, { headers: this.getAuthHeaders() });
  }

  getAllSessionActivitiesByUserId(userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/get-all-by-user`, { userId }, { headers: this.getAuthHeaders() });
  }

  getAllSessionActivitiesBySelectedUserId(userIds: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/get-all-by-selected-user`, { user_id: userIds }, { headers: this.getAuthHeaders() });
  }

  getSessionActivityDetailsById(activityId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/get-details-by-id`, { activityId }, { headers: this.getAuthHeaders() });
  }

  getUrlByActivityId(activityId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/get-url`, { activityId }, { headers: this.getAuthHeaders() });
  }
}
