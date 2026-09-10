import { Injectable } from '@angular/core';
import { retry } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class WhatsappTemplatesService {

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

  createWhatsappTemplate(data: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/whatsapp-templates/create`, data, { headers: this.headers }
    ).pipe(retry(1));
  }

  updateWhatsappTemplate(data: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/whatsapp-templates/update`, data, { headers: this.headers }
    ).pipe(retry(1));
  }

  getAllWhatsappTemplates(data: any) {
    this.setHeader();
    const page = data.start === 0 ? 1 : (data.start / data.length) + 1;
    return this.httpClient.post<any>(
      `${environment.apiUrl}/whatsapp-templates/get-all`,
      { page, limit: data.length, search_key: data.search.value },
      { headers: this.headers }
    ).pipe(retry(1));
  }

  getWhatsappTemplateById(templateId: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/whatsapp-templates/get-by-id`,
      { template_id: templateId },
      { headers: this.headers }
    ).pipe(retry(1));
  }

  deleteWhatsappTemplate(templateId: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/whatsapp-templates/delete`,
      { template_id: templateId },
      { headers: this.headers }
    ).pipe(retry(1));
  }

  toggleWhatsappTemplateStatus(templateId: any) {
    this.setHeader();
    return this.httpClient.post<any>(
      `${environment.apiUrl}/whatsapp-templates/toggle-status`,
      { template_id: templateId },
      { headers: this.headers }
    ).pipe(retry(1));
  }
}