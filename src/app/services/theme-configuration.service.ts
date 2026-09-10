import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ThemeListPayload {
  search?: string;
  page?: number;
  limit?: number;
  status?: number | string;
    scope?: 'global' | 'all';   // 👈 NEW — 'global' = sirf super-admin-created themes

}
export interface ThemeConfig {
  id?: number;
  theme_name: string;
  description?: string;
  status: number;
is_global?: boolean;
  is_owner?: boolean;   // 👈 agar already nahi hai to add karo
  primary_color: string;
  primary_hover_color: string;

  sidebar_color: string;
  sidebar_active_color: string;
  sidebar_active_text_color: string;
  sidebar_text_color: string;
  sidebar_hover_color: string;
  sidebar_icon_color: string;
  sidebar_hover_bg_color: string;
  sidebar_border_color: string;

  navbar_color: string;
  navbar_text_color: string;
  navbar_icon_color: string;
  navbar_hover_color: string;

  page_background_color: string;
  card_background_color: string;
  card_border_color: string;
  section_header_color: string;

  input_background_color: string;
  input_border_color: string;
  input_focus_background_color: string;
  input_disabled_background_color: string;

  text_color: string;
  label_color: string;
  muted_text_color: string;
  border_color: string;
  error_color: string;

  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;

  can_edit?: boolean;
  can_delete?: boolean;
  can_toggle_status?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeConfigurationService {
  private baseUrl = `${environment.apiUrl}/theme-configurations`;

  constructor(private http: HttpClient) {}

  /** POST /api/theme-configurations/list */
  listAllThemes(payload: ThemeListPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/list`, payload);
  }

  /** POST /api/theme-configurations/get */
  getThemeById(id: string | number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/get`, { id });
  }

  /** POST /api/theme-configurations/create */
  createTheme(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/create`, data);
  }

  /** POST /api/theme-configurations/update */
  updateTheme(id: string | number, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/update`, { id, ...data });
  }

  /** POST /api/theme-configurations/toggle-status */
  toggleThemeStatus(id: string | number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/toggle-status`, { id });
  }

  /** POST /api/theme-configurations/delete */
  deleteTheme(id: string | number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/delete`, { id });
  }

  /** POST /api/theme-configurations/my-theme — logged-in admin's own theme, if one exists */
  getMyTheme(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/my-theme`, {});
  }
  applyTheme(themeId: number): Observable<any> {
  return this.http.post(`${this.baseUrl}/apply`, { theme_id: themeId });
}
}
