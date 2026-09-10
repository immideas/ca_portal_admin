import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({ providedIn: 'root' })
export class SubCategoryService {
  private apiUrl = `${environment.apiUrl}/sub-categories`;

  constructor(private http: HttpClient) {
  }
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  createSubCategory(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, data, { headers: this.getAuthHeaders() });
  }

  
  listSubCategories(filters: any = {}): Observable<any> {
    return this.http.post(`${this.apiUrl}/list`, filters, { headers: this.getAuthHeaders() });
  }

  getSubCategoriesByCategory(categoryId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/by-category`, { categoryId }, { headers: this.getAuthHeaders() });
  }

  getSubCategoryById(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/get`, { id }, { headers: this.getAuthHeaders() });
  }

 
  updateSubCategory(data:any): Observable<any> {
    return this.http.post(`${this.apiUrl}/update`, data, { headers: this.getAuthHeaders() });
  }
  deleteSubCategory(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete`, { id }, { headers: this.getAuthHeaders() });
  }
}