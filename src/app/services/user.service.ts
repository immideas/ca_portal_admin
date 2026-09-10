import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
export interface CustomizeThemePayload {
  user_id: string | number;
  theme_name: string;
  description?: string | null;
  primary_color: string;
  primary_hover_color: string;
  sidebar_color: string;
  sidebar_active_color: string;
  sidebar_text_color: string;
  navbar_color: string;
  navbar_text_color: string;
}
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }


getAllUsers(payload: any = {}): Observable<any> {
  return this.http.post<any>(
    `${this.apiUrl}/getAllUsers`,
    payload,
    { headers: this.getAuthHeaders() }
  );
}
  getUserById(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/getUserById`, { id }, { headers: this.getAuthHeaders() });
  }

  createUser(user: any, modelName: string = 'User'): Observable<any> {
    const payload = { ...user, model_name: modelName };
    return this.http.post(`${this.apiUrl}/createUser`, payload, { headers: this.getAuthHeaders() });
  }

  updateUser(user: any, modelName: string = 'User'): Observable<any> {
    const payload = { ...user, model_name: modelName, record_id: user.id };
    return this.http.post(`${this.apiUrl}/updateUser`, payload, { headers: this.getAuthHeaders() });
  }

  deleteUser(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/deleteUser`, { id }, { headers: this.getAuthHeaders() });
  }

  enableUser(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/enableUser`, { id }, { headers: this.getAuthHeaders() });
  }

  addSubAdminPermissions(id: string, permissions: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/addSubAdminPermissions`, { id, permissions }, { headers: this.getAuthHeaders() });
  }

  addAdminPermissions(id: string, permissions: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/addAdminPermissions`, { id, permissions }, { headers: this.getAuthHeaders() });
  }

  getMyPermissions(): Observable<any> {
    return this.http.post(`${this.apiUrl}/permissions`, {}, { headers: this.getAuthHeaders() });
  }

  getUsersByRoleAndCreator(role: number | string, createdBy: number | string): Observable<any[]> {
    return this.http.post<any[]>(
      `${this.apiUrl}/getUsersByRoleAndCreator`,
      { role: Number(role), createdBy: Number(createdBy) },
      { headers: this.getAuthHeaders() }
    );
  }

  getUserAcquisitionStats(): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/userAcquisitionStats`, {}, { headers: this.getAuthHeaders() });
  }
  totalUsersCount(): Observable<any> {
    return this.http.post(`${this.apiUrl}/totalUsersCount`, {}, {
      headers: this.getAuthHeaders()
    });
  }
  resetUserPassword(userId: string | number): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/reset-user-password`, { id: userId }, { headers: this.getAuthHeaders() });
}
updateUserTheme(userId: string | number, themeId: string | number): Observable<any> {
  return this.http.post<any>(
    `${this.apiUrl}/update-user-theme`,
    { user_id: userId, theme_id: themeId },   // 👈 backend ke keys se match
    { headers: this.getAuthHeaders() }
  );
}
/**
 * One-time self-service theme customization: creates a new
 * ThemeConfiguration AND assigns it to the user in a single atomic
 * backend call (gated server-side by the `customize_theme` plan
 * feature + the user's `has_customized_theme` flag).
 */
customizeUserTheme(payload: CustomizeThemePayload): Observable<any> {
  return this.http.post<any>(
    `${this.apiUrl}/customize-theme`,
    payload,
    { headers: this.getAuthHeaders() }
  );
}
updateCustomTheme(
  themeId: number,
  payload: any
) {
  return this.http.post<any>(
    `${environment.apiUrl}/theme-configurations/update`,
    { id: themeId, ...payload },
    { headers: this.getAuthHeaders() }
  );
}
}
