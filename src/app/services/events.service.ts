import { Injectable } from '@angular/core';
import { retry } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root',
})
export class EventsService {

   private apiUrlEvents = `${environment.apiUrl}/events`;
      private apiUrlTrigger = `${environment.apiUrl}/communication-triggers`;


  constructor(
    private httpClient: HttpClient,
    private authService: AuthService,
  ) {}
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAllEvents(data: {
    page: number;
    limit: number;
    search_key: string;
    order: { column: string; dir: string };
  }) {
    return this.httpClient
      .post<any>(`${this.apiUrlEvents}/get-all`, data, {
        headers: this.getAuthHeaders(),
      })
      .pipe(retry(1));
  }

  createEvent(data: { name: string; description: string; status: number }) {
    
    return this.httpClient
      .post<any>(`${this.apiUrlEvents}/create`, data, {
        headers: this.getAuthHeaders(),
      })
      .pipe(retry(1));
  }

  updateEvent(data: {
    event_id: number;
    name: string;
    description: string;
    status: number;
  }) {
    return this.httpClient
      .post<any>(`${this.apiUrlEvents}/update`, data, {
        headers: this.getAuthHeaders(),
      })
      .pipe(retry(1));
  }

  listCommunicationTriggers() {
    return this.httpClient
      .post<any>(
        `${this.apiUrlTrigger}/list`,
        {},
        { headers: this.getAuthHeaders() },
      )
      .pipe(retry(1));
  }

  createCommunicationTrigger(data: {
    event_id: number;
    sms: boolean;
    email: boolean;
    whatsapp: boolean;
  }) {
    return this.httpClient
      .post<any>(
        `${this.apiUrlTrigger}/create`,
        data,
        { headers: this.getAuthHeaders() },
      )
      .pipe(retry(1));
  }

  updateCommunicationTrigger(data: {
    trigger_id: number;
    event_id: number;
    sms: boolean;
    email: boolean;
    whatsapp: boolean;
    status: number;
  }) {
    return this.httpClient
      .post<any>(
        `${this.apiUrlTrigger}/update`,
        data,
        { headers: this.getAuthHeaders() },
      )
      .pipe(retry(1));
  }

}