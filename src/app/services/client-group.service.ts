import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientGroupService {
  private apiUrl = `${environment.apiUrl}/client-groups`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  createClientGroup(clientGroup: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/create`,
      clientGroup,
      { headers: this.getAuthHeaders() }
    );
  }

  updateClientGroup(clientGroup: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/update`,
      clientGroup,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteClientGroup(id: string | number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/delete`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  listAllClientGroups(payload: any = {}): Observable<any[]> {
    return this.http.post<any[]>(
      `${this.apiUrl}/list`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  listClientGroupById(id: string | number | null): Observable<any> {
    if (!id) {
      throw new Error('Client Group ID is required');
    }

    return this.http.post<any>(
      `${this.apiUrl}/get`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  enableClientGroup(id: string | number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/enable`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }
}