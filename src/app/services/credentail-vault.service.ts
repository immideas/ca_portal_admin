import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CredentialVaultService {
  private apiUrl = `${environment.apiUrl}/credential-vault`;

  constructor(private http: HttpClient) {}

  // Create credential
  createCredential(data: {
    clientId: number;
    portalId: number;
    username: string;
    password: string;
    consentAccepted: boolean;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, data);
  }

  // Get credentials by client
  getCredentialsByClient(clientId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/list/${clientId}`, {});
  }

  // Update credential
  updateCredential(
    id: number,
    data: {
      portalId?: number;
      username?: string;
      password?: string;
      consentAccepted?: boolean;
    }
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/update/${id}`, data);
  }

  // Delete credential
  deleteCredential(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete/${id}`, {});
  }

  // View/decrypt password
  viewCredentialPassword(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/view-password/${id}`);
  }
  
  // Request password from client
  requestCredentialPassword(data: {
    clientId: number;
    portalId: number;
  }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/request-password`,
      data
    );
  }

  // Get all password requests for a client
  getPasswordRequestsByClient(clientId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/requests/${clientId}`
    );
  }

}