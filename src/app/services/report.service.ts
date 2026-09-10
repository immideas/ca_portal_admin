import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apiUrl = `${environment.apiUrl}/report/download`;
 constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
downloadExcelReport(payload: any): Observable<Blob> {
  return this.http.post(
    `${this.apiUrl}/excel`,
    payload,
    {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    }
  );
}

downloadPDFReport(payload: any): Observable<Blob> {
  return this.http.post(
    `${this.apiUrl}/pdf`,
    payload,
    {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    }
  );
}
getDashboard(payload: any): Observable<any> {
  return this.http.post(
    `${this.apiUrl}/dashboard`,
    payload,
    {
      headers: this.getAuthHeaders()
    }
  );
}
}
