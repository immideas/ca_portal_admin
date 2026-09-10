import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

export interface SmtpConfig {
  id?: number;
  projectId?: number | null;
  project?: { name: string };
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  authPass?: string;
}

export interface SmtpApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmtpConfigService {

  private baseUrl = `${environment.apiUrl}/smtp`;
  private headers!: HttpHeaders;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
  ) {}

  private setHeader(): void {
    this.headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getLocalStorage('token')}`
    });
  }

 
  getAll(): Observable<SmtpApiResponse<SmtpConfig[] | SmtpConfig>> {
    this.setHeader();
    return this.http.post<SmtpApiResponse<SmtpConfig[] | SmtpConfig>>(
      `${this.baseUrl}/get-all`,
      {},
      { headers: this.headers }
    );
  }

  
  getById(id: number | string): Observable<SmtpApiResponse<SmtpConfig>> {
    this.setHeader();
    return this.http.post<SmtpApiResponse<SmtpConfig>>(
      `${this.baseUrl}/get`,
      { id },
      { headers: this.headers }
    );
  }

 
  save(payload: SmtpConfig): Observable<SmtpApiResponse<SmtpConfig>> {
    this.setHeader();
    return this.http.post<SmtpApiResponse<SmtpConfig>>(
      `${this.baseUrl}/save`,
      payload,
      { headers: this.headers }
    );
  }

 
  delete(id: number | string): Observable<SmtpApiResponse<null>> {
    this.setHeader();
    return this.http.post<SmtpApiResponse<null>>(
      `${this.baseUrl}/delete`,
      { id },
      { headers: this.headers }
    );
  }
  getGlobalSmtpConfig(): Observable<SmtpApiResponse<SmtpConfig>> {
    this.setHeader();
    return this.http.post<SmtpApiResponse<SmtpConfig>>(`${this.baseUrl}/get-super-admin`, {}, { headers: this.headers });
  }
}
