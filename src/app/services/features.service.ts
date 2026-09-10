import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FeaturesService {

  private base = `${environment.apiUrl}/features`;
  private permissionsBase = `${environment.apiUrl}/permissions`;

  constructor(private http: HttpClient) {}

  list(payload: any): Observable<any> {
    return this.http.post(`${this.base}/list`, payload);
  }

  getById(feature_id: string | number): Observable<any> {
    return this.http.post(`${this.base}/details`, { feature_id });
  }

  create(payload: any): Observable<any> {
    return this.http.post(`${this.base}/create`, payload);
  }

  update(payload: any): Observable<any> {
    // payload must include feature_id
    return this.http.post(`${this.base}/update`, payload);
  }

  changeStatus(feature_id: string | number, status: number): Observable<any> {
    return this.http.post(`${this.base}/status`, { feature_id, status });
  }

  delete(feature_id: string | number): Observable<any> {
    return this.http.post(`${this.base}/delete`, { feature_id });
  }

  // 👈 NEW — dynamic permission groups, used by Add Feature screen
  getPermissionGroups(): Observable<any> {
    return this.http.get(`${this.permissionsBase}/group-codes`);
  }
}