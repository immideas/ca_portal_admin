import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  createRole(role: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, role, { headers: this.getAuthHeaders() });
  }

  updateRole(role: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/update`, role, { headers: this.getAuthHeaders() });
  }

  deleteRole(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete`, { id }, { headers: this.getAuthHeaders() });
  }

  listAllRoles(payload:any={}): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/list`, payload, { headers: this.getAuthHeaders() });
  }

  listRoleById(id: string | null): Observable<any> {
    if (!id) {
      throw new Error('Role ID is required');
    }
    return this.http.post<any>(`${this.apiUrl}/get`, { id }, { headers: this.getAuthHeaders() });
  }

  listRoleImages(): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/list-images`, {}, { headers: this.getAuthHeaders() });
  }

  assignPermissionAndGroupCode(payload: { id: number, permission: string[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/assign-permission-group`, payload, { headers: this.getAuthHeaders() });
  }



  getRolesByAdmin(adminId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/by-admin/${adminId}`,
      { headers: this.getAuthHeaders() }
    );
  }
  getRoleByShortCode(shortCode: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/super/by-shortcode?shortCode=${shortCode}`, {
    headers: this.getAuthHeaders()
  });
}
}

