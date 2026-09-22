import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class DocumentRequestService {
  private base = `${environment.apiUrl}/document-requests`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  constructor(private http: HttpClient) {}

  create(payload: any): Observable<any> {
    return this.http.post(
      `${this.base}/create`,
      payload,
      { headers: this.getHeaders() }
    );
  }
   update(payload: any): Observable<any> {
    return this.http.post(
      `${this.base}/update`,
      payload,
      {
        headers: this.getHeaders()
      }
    );
  }

  list(payload: any = {}): Observable<any> {
    return this.http.post(
      `${this.base}/list`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  getById(id: number | string): Observable<any> {
    return this.http.post(
      `${this.base}/get`,
      { id },
      { headers: this.getHeaders() }
    );
  }
}