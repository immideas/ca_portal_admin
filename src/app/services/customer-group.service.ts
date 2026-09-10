import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  private apiUrl = `${environment.apiUrl}/customers`;
  private projectUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  
  createCustomerForGroup(data: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/create-group-customer`,
      data,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  listCustomers(payload: any = {}): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/list`,
      payload,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  getCustomerById(id: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/get`,
      { id },
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  updateCustomer(data: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/update`,
      data,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  deleteCustomer(id: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/delete`,
      { id },
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  
importCustomers(file: File, projectId: string): Observable<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId); 

  return this.http.post(
    `${this.apiUrl}/import`,
    formData,
    { headers: this.getAuthHeaders() }
  );
}
 listProjects(payload: any = {}): Observable<any> {
    return this.http.post(
      `${this.projectUrl}/list`,
      payload,
      {
        headers: this.getAuthHeaders()
      }
    );
  }
}