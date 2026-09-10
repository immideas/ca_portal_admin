import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isLogoutInProgress = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const publicApi =
      request.url.includes('/open/') ||
      request.url.includes('/feedback') ||
      request.url.includes('/feedback/thank-you') ||
      request.url.includes('/track') ||
      request.url.includes('/track-status') ||
      request.url.includes('/session-activities/log-each-route'); 
    const token = this.authService.currentToken;

    let geoLocation = localStorage.getItem('geo_location');
    let userIp = localStorage.getItem('user_ip');
    let headers = request.headers;


    if (token && !publicApi) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (geoLocation) {
      headers = headers.set('x-geo-location', geoLocation);
    }

    if (userIp) {
      headers = headers.set('x-user-ip', userIp);
    }

    const cloned = request.clone({ headers });

    return next.handle(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !publicApi) {
          this.handle401Error();
        }

        if (error.status === 403) {
          console.warn('Access forbidden - insufficient permissions');
        }

        console.error('HTTP Error:', {
          status: error.status,
          message: error.message,
          url: error.url
        });

        return throwError(() => error);
      })
    );
  }

  private handle401Error(): void {
    if (this.isLogoutInProgress) {
      return;
    }

    this.isLogoutInProgress = true;

    console.log('401 Unauthorized - Logging out user');

    this.authService.logout();

    setTimeout(() => {
      this.isLogoutInProgress = false;
    }, 1000);
  }
}


