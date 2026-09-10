import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { jwtDecode } from 'jwt-decode';
import { SocketService } from './services/socketpermission.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  private roleSubject = new BehaviorSubject<string | null>(localStorage.getItem('role'));
  private roleCodeSubject = new BehaviorSubject<string | null>(localStorage.getItem('roleCode'));
  private adminIdSubject = new BehaviorSubject<string | null>(localStorage.getItem('adminId'));
  private nameSubject = new BehaviorSubject<string | null>(localStorage.getItem('name'));
  private statusSubject = new BehaviorSubject<string | null>(localStorage.getItem('status'));
  private permissionsSubject = new BehaviorSubject<string | null>(localStorage.getItem('permissions'));

  token = this.tokenSubject.asObservable();
  role = this.roleSubject.asObservable();
  roleCode = this.roleCodeSubject.asObservable();
  adminId = this.adminIdSubject.asObservable();
  name = this.nameSubject.asObservable();
  status = this.statusSubject.asObservable();
  permissions = this.permissionsSubject.asObservable();

private mustChangePasswordSubject = new BehaviorSubject<boolean>(
  localStorage.getItem('mustChangePassword') === 'true'
);
mustChangePassword = this.mustChangePasswordSubject.asObservable();

get currentMustChangePassword(): boolean {
  return this.mustChangePasswordSubject.value;
}

// 👇 NEW — theme state, same pattern as `plan`.
private themeSubject = new BehaviorSubject<any>(this.getStoredTheme());
theme = this.themeSubject.asObservable();

get currentTheme(): any {
  return this.themeSubject.value;
}

private getStoredTheme(): any {
  try {
    const t = localStorage.getItem('theme');
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
}

/**
 * 👇 NEW — call this right after a theme is successfully saved
 * (choose-theme or customize-theme) for the CURRENTLY LOGGED-IN
 * user. It updates localStorage + emits on themeSubject so every
 * subscriber (LayoutComponent etc.) re-applies the theme instantly,
 * without needing a refresh or re-login.
 *
 * Do NOT call this for the Super Admin "assign theme to another
 * admin" flow — that theme belongs to a different user's session,
 * not this one.
 */
setTheme(theme: any): void {
  if (theme) {
    localStorage.setItem('theme', JSON.stringify(theme));
  } else {
    localStorage.removeItem('theme');
  }
  this.themeSubject.next(theme);
}

private permissionsRefreshedSubject = new Subject<void>();
permissionsRefreshed$ = this.permissionsRefreshedSubject.asObservable();
  constructor(private http: HttpClient, private router: Router,
      private socketService: SocketService

  ) {
    this.watchToken();
    this.checkInitialAuthState();
  const existingToken = localStorage.getItem('token');
  const existingId = localStorage.getItem('adminId');
  if (existingToken && existingId) {
    this.socketService.connect(existingId);
  }
    window.addEventListener('storage', (event) => {
      if (event.key === 'token' && event.newValue === null) {
        this.clearUserData();
        this.navigateToLogin();
      }
      if (event.key === 'roleCode') {
        this.roleCodeSubject.next(event.newValue);
      }
      // 👇 NEW — keep other open tabs in sync when theme changes.
      if (event.key === 'theme') {
        try {
          this.themeSubject.next(event.newValue ? JSON.parse(event.newValue) : null);
        } catch {
          this.themeSubject.next(null);
        }
      }
    });
  }

 private get authHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getLocalStorage('token')}`,
    });
  }

  getLocalStorage(key: string): string | null {
    return localStorage.getItem(key);
  }

  setLocalStorage(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  private checkInitialAuthState(): void {

    const token = localStorage.getItem('token');

    const url = window.location.pathname;
    const publicRoutes = ['/login', '/feedback', '/track-status'];

    const isPublicRoute = publicRoutes.some(route =>
      url.startsWith(route)
    );

    if (!token && !isPublicRoute) {
      this.router.navigate(['/login']);
    }

  }
  get currentToken(): string | null {
    return this.tokenSubject.value;
  }

  get currentRole(): string | null {
    return this.roleSubject.value;
  }

  get currentRoleCode(): string | null {
    return this.roleCodeSubject.value;
  }

  get currentAdminId(): string | null {
    return this.adminIdSubject.value;
  }

  get currentStatus(): string | null {
    return this.statusSubject.value;
  }

  get currentPermissions(): string | null {
    return this.permissionsSubject.value;
  }

  login(email: string, password: string, loginUrl: string, httpOptions?: { headers?: any }): Observable<any> {
    const body = { email, password };
    let options = {};
    if (httpOptions && httpOptions.headers) {
      options = { headers: new HttpHeaders(httpOptions.headers) };
    }
    return this.http.post<any>(loginUrl, body, options).pipe(
      map(({ token, role, roleCode, id, name, status, permissions, plan, mustChangePassword, theme }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('roleCode', roleCode);
        localStorage.setItem('adminId', id);
                localStorage.setItem('user_id', id);
        localStorage.setItem('name', name);
        localStorage.setItem('status', status);
              localStorage.setItem('mustChangePassword', String(!!mustChangePassword));

  if (plan) {
  localStorage.setItem('plan', JSON.stringify(plan));
} else {
  localStorage.removeItem('plan');
}

if (theme) {
  localStorage.setItem('theme', JSON.stringify(theme));
  this.themeSubject.next(theme);
} else {
  localStorage.removeItem('theme');
  this.themeSubject.next(null);
}



        this.tokenSubject.next(token);
        this.roleSubject.next(role);
        this.roleCodeSubject.next(roleCode);
        this.adminIdSubject.next(id);
        this.nameSubject.next(name);
        this.statusSubject.next(status);
              this.mustChangePasswordSubject.next(!!mustChangePassword);


      const normalizedPermissions = Array.isArray(permissions)
        ? permissions.join(',')
        : (typeof permissions === 'string' ? permissions : '');

      this.setPermissions(normalizedPermissions);
        this.socketService.connect(id);
        return { token, role, roleCode, id, name, status, permissions, plan, mustChangePassword, theme };
      }),
    );
  }

  logout(): void {
    const token = this.currentToken;

    if (token) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => {
          console.log('Successfully logged out from server');
          this.clearUserData();
          this.navigateToLogin();
        },
        error: (err) => {
          console.error('Logout error:', err);
          this.clearUserData();
          this.navigateToLogin();
        }
      });
    } else {
      this.clearUserData();
      this.navigateToLogin();
    }
  }

  private clearUserData(): void {
    localStorage.clear();

    this.tokenSubject.next(null);
    this.roleSubject.next(null);
    this.roleCodeSubject.next(null);
    this.adminIdSubject.next(null);
    this.nameSubject.next(null);
    this.statusSubject.next(null);
    this.permissionsSubject.next(null);
    this.mustChangePasswordSubject.next(false);
    this.themeSubject.next(null);
      this.socketService.disconnect();

  }

  private navigateToLogin(): void {
    setTimeout(() => {
      this.router.navigate(['/login'], {
        queryParams: { message: 'You have been logged out' }
      });
    }, 100);
  }

  isLoggedIn(): boolean {
    return !!this.currentToken;
  }

  private watchToken(): void {
    this.tokenSubject.subscribe(token => {

      const publicRoutes = ['/login', '/feedback', '/track-status'];
      const currentUrl = window.location.pathname;
      const isPublicRoute = publicRoutes.some(route =>
        currentUrl.startsWith(route)
      );

      if (!token && !isPublicRoute) {
        this.router.navigate(['/login'], {
          queryParams: { message: 'Session expired. Please log in again.' }
        });
      }
    });
  }

  setPermissions(permissions: string): void {
    localStorage.setItem('permissions', permissions);
    this.permissionsSubject.next(permissions);
  }

  sendHttpRequest(type: string, route: string, data: any, headers?: any): Observable<any> {
    const reqHeaders = headers ?? this.authHeaders;

    if (type === 'POST') {
      return this.http
        .post<any>(`${environment.apiUrl}${route}`, data, { headers: reqHeaders })

    } else if (type === 'PATCH') {
      return this.http
        .patch<any>(`${environment.apiUrl}${route}`, data, { headers: reqHeaders })

    }
    return this.http
      .get<any>(`${environment.apiUrl}${route}`, { headers: reqHeaders })

  }

  getTokenExpirationDate(token: string): Date | null {
    const decoded: any = jwtDecode(token);
    if (decoded.exp === undefined) return null;
    const date = new Date(0);
    date.setUTCSeconds(decoded.exp);
    return date;
  }

  isTokenExpired(): boolean {
    const token = this.getLocalStorage('token');
    if (!token) return true;
    const date = this.getTokenExpirationDate(token);
    if (date === undefined || date === null) return false;
    return !(date.valueOf() > new Date().valueOf());
  }

  changePassword(payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/change-password`, payload, { headers: this.authHeaders });
  }

  getPermissions(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/get-permissions`, {}, { headers: this.authHeaders });
  }

  checkPermissions(data: { permission?: string; permissions?: string[]; mode?: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/check-permission`, data, { headers: this.authHeaders });
  }

  forgetPassword(payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, payload, { headers: this.authHeaders });
  }

  verifyLink(payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/verify-link`, payload, { headers: this.authHeaders });
  }

  resetPassword(payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/reset-password`, payload, { headers: this.authHeaders });
  }

  changeTemporaryPassword(payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/change-temporary-password`, payload, { headers: this.authHeaders });
  }

  getProfileData(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/profile`, {}, { headers: this.authHeaders });
  }

  getAwsCredentials(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/aws/credentials`, {}, { headers: this.authHeaders });
  }

  registerTemporaryImage(payload: { file_key: string; upload_type: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/temporary-images/image-register`, payload, { headers: this.authHeaders });
  }
  clearMustChangePassword(): void {
  localStorage.setItem('mustChangePassword', 'false');
  this.mustChangePasswordSubject.next(false);
}
notifyPermissionsRefreshed(): void {
  this.permissionsRefreshedSubject.next();
}
}
