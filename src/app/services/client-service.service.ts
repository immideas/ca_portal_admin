import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientServiceService {

  private apiUrl = `${environment.apiUrl}/client-services`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Assign multiple services to a client
   */
  createClientServices(
    clientId: number,
    serviceIds: number[]
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/create`,
      {
        clientId,
        serviceIds
      },
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Get all services assigned to a client
   */
  getClientServices(clientId: number): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/list`,
      {
        clientId
      },
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Get client service by ID
   */
  getClientServiceById(id: number): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/get`,
      {
        id
      },
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Disable client service
   */
  deleteClientService(id: number): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/delete`,
      {
        id
      },
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Enable client service
   */
  enableClientService(id: number): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/enable`,
      {
        id
      },
      {
        headers: this.getAuthHeaders()
      }
    );
  }
}