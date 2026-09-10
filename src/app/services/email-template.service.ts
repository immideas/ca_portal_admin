import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmailTemplateService {
  private api = `${environment.apiUrl}/email-template`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // getTemplates(): Observable<any> {
  //   return this.http.post(`${this.api}/list`, { headers: this.getAuthHeaders() });
  // }

  // getTemplateID(id: any): Observable<any> {
  //   return this.http.post(`${this.api}/get/${id}`, { headers: this.getAuthHeaders() });
  // }
getTemplates(): Observable<any> {
  return this.http.post(`${this.api}/list`, {}, { headers: this.getAuthHeaders() });
}

getTemplateID(id: any): Observable<any> {
  return this.http.post(`${this.api}/get/${id}`, {}, { headers: this.getAuthHeaders() });
}

deleteTemplate(id: any): Observable<any> {
  return this.http.post(`${this.api}/delete/${id}`, {}, { headers: this.getAuthHeaders() });
}
  createTemplate(data: any): Observable<any> {
    return this.http.post(`${this.api}/create`, data, { headers: this.getAuthHeaders() });
  }

  updateTemplate(data: any): Observable<any> {
    return this.http.post(`${this.api}/update`, data, { headers: this.getAuthHeaders() });
  }

  // deleteTemplate(id: any): Observable<any> {
  //   return this.http.post(`${this.api}/delete/${id}`, { headers: this.getAuthHeaders() });
  // }
}