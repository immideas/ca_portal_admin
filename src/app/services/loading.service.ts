import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private base = `${environment.apiUrl}/loading`;

  constructor(
    private http: HttpClient,          
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getLoading(userId?: any): Observable<any> {
    const targetUserId = userId || this.authService.getLocalStorage('user_id');
    const payload = { user_id: targetUserId };

    return this.http.post<any>(
      `${this.base}/check-login`,
      payload,
      { headers: this.getHeaders() }   
    );
  }
}
