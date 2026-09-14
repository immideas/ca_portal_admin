import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  createClient(client: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/create`,
      client,
      { headers: this.getAuthHeaders() }
    );
  }

  updateClient(client: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/update`,
      client,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteClient(id: string | number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/delete`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  listAllClients(payload: any = {}): Observable<any[]> {
    return this.http.post<any[]>(
      `${this.apiUrl}/list`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  listClientById(id: string | number | null): Observable<any> {
    if (!id) {
      throw new Error('Client ID is required');
    }

    return this.http.post<any>(
      `${this.apiUrl}/get`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  enableClient(id: string | number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/enable`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }
}