import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); 
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAdmins(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/all`, {}, { headers });
  }

  getAdminById(id: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/get`, { id }, { headers });
  }

  createAdmin(admin: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/createUser`, admin, { headers }); 
  }

  updateAdmin(id: string, admin: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/update`, { id, ...admin }, { headers });
  }

  deleteAdmin(id: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/delete`, { id }, { headers });
  }
}