import { Injectable } from '@angular/core';
import { retry } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
@Injectable({
  providedIn: 'root'
})
export class SmsTemplatesService {

  headers: any;

  constructor(
    private httpClient: HttpClient,
    private router: Router,
    private authService: AuthService,
  ) { }

  setHeader() {
    this.headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getLocalStorage('token')}`
    });
  }

  createSmsTemplate(data: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/sms-templates/create`, data, { headers: this.headers }
    ).pipe(retry(1));
  }

  updateSmsTemplate(data: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/sms-templates/update`, data, { headers: this.headers }
    ).pipe(retry(1));
  }

  getAllSmsTemplates(data: any) {
    this.setHeader();
    const page = data.start === 0 ? 1 : (data.start / data.length) + 1;
    return this.httpClient.post<any>(
      `${environment.apiUrl}/sms-templates/get-all`,
      { page, limit: data.length, search_key: data.search.value },
      { headers: this.headers }
    ).pipe(retry(1));
  }

  getSmsTemplateById(templateId: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/sms-templates/get-by-id`,
      { template_id: templateId },
      { headers: this.headers }
    ).pipe(retry(1));
  }

  deleteSmsTemplate(templateId: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/sms-templates/delete`,
      { template_id: templateId },
      { headers: this.headers }
    ).pipe(retry(1));
  }

  toggleSmsTemplateStatus(templateId: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/sms-templates/toggle-status`,
      { template_id: templateId },
      { headers: this.headers }
    ).pipe(retry(1));
  }
}