import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  private apiUrl = `${environment.apiUrl}/permissions`;
  private userApiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {

    const token = localStorage.getItem('token');

    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });

  }

  
  createPermission(permission: any): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/create`,
      permission,
      { headers: this.getAuthHeaders() }
    );

  }

  updatePermission(permission: any): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/update`,
      permission,
      { headers: this.getAuthHeaders() }
    );

  }

  deletePermission(id: string): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/delete`,
      { id },
      { headers: this.getAuthHeaders() }
    );

  }

  listAllPermissions(targetUserId?: number | string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/list`,
      targetUserId ? { id: targetUserId } : {},
      
      { headers: this.getAuthHeaders() }
    );

  }

  listPermissionById(data: { id: string }): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/getById`,
      data,
      { headers: this.getAuthHeaders() }
    );

  }

  listUniqueGroupNames(): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/uniqueGroupNames`,
      {},
      { headers: this.getAuthHeaders() }
    );

  }

  setDefaultPermissions(
    permissions: string[]
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/set-default`,
      { permissions },
      { headers: this.getAuthHeaders() }
    );

  }

  listPermissionUsers(): Observable<any> {

    return this.http.post(
      `${this.userApiUrl}/getAllUsers`,
      {},
      { headers: this.getAuthHeaders() }
    );

  }

  giveUsersPermissions(
    id: number,
    permissions: string[],
    group_code: string[]
  ): Observable<any> {
    console.log('PermissionService - giveUsersPermissions payload:', {
      id,
      permissions,
      group_code
    });
    return this.http.post(
      `${this.userApiUrl}/addAdminPermissions`,
      {
        id,
        permissions,
        group_code
      },
      {
        headers: this.getAuthHeaders()
      }
    );

  }

}
