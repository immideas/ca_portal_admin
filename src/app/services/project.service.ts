import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  create(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, data, {
      headers: this.getAuthHeaders()
    });
  }

  list(payload: any = {}): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  getById(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/get`, { id }, {
      headers: this.getAuthHeaders()
    });
  }

  update(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/update`, data, {
      headers: this.getAuthHeaders()
    });
  }

  delete(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete`, { id }, {
      headers: this.getAuthHeaders()
    });
  }
  toggleStatus(id: string) {
  return this.http.post(`${this.apiUrl}/toggle-status`, { id });
}
  totalProject(): Observable<any> {
    return this.http.post(`${this.apiUrl}/totalProject`, {}, {
      headers: this.getAuthHeaders()
    });
  }
}
