import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

export interface LogRoutePayload{
  sessionId: number;
  pageVisited: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionActivityService {

  headers: HttpHeaders = new HttpHeaders();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  private setHeader() {
    this.headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.currentToken}`
    });
  }
  private getheaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.currentToken}`
    });
}


  logEachRoute(page: string): Observable<any> {
    const payload = { pageVisited: page };
    return this.http.post(
      `${environment.apiUrl}/session-activities/log-each-route`,
      payload,
      { headers: this.getheaders() }
    );
  }


  initRouteTracking() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const page = event.urlAfterRedirects || event.url;
        this.logEachRoute(page).subscribe({
          next: () => { },
          error: err => { }
        });
      }
    });
  }
}