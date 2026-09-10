import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  

  createCategory(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, data, {
      headers: this.getAuthHeaders()
    });
  }
  listCategories(payload: any = {}): Observable<any> {
    return this.http.post(`${this.apiUrl}/list`, payload, { headers: this.getAuthHeaders() });
  }
  
  getCategoryById(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/get`, { id }, { headers: this.getAuthHeaders() });
  }

 
  updateCategory(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/update`, data, { headers: this.getAuthHeaders() });
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete`, { id }, { headers: this.getAuthHeaders() });
  }
}