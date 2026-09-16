import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  createDocument(document: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/create`,
      document,
      { headers: this.getAuthHeaders() }
    );
  }

  updateDocument(document: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/update`,
      document,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteDocument(id: string | number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/delete`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  listAllDocuments(payload: any = {}): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/list`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  listDocumentById(id: string | number | null): Observable<any> {
    if (!id) {
      throw new Error('Document ID is required');
    }

    return this.http.post<any>(
      `${this.apiUrl}/get`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  enableDocument(id: string | number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/enable`,
      { id },
      { headers: this.getAuthHeaders() }
    );
  }

  getDocumentsByGroup(groupCode: string): Observable<any> {
    if (!groupCode) {
      throw new Error('Group code is required');
    }

    return this.http.post<any>(
      `${this.apiUrl}/group`,
      { groupCode },
      { headers: this.getAuthHeaders() }
    );
  }
    listUniqueGroupNames(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/unique-group-names`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }
}