import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = this.authService.currentToken || localStorage.getItem('token');
    if (token) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}

@Injectable({
  providedIn: 'root',
})
export class SuperAdminAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = this.authService.currentToken || localStorage.getItem('token');
    const roleCode = this.authService.currentRoleCode || localStorage.getItem('roleCode');
    if (token && roleCode === 'super_admin') {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}

@Injectable({
  providedIn: 'root',
})

export class AdminAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = this.authService.currentToken || localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const roleCode = this.authService.currentRoleCode || localStorage.getItem('roleCode');

   
    if (roleCode === 'super_admin' && !route.data['allowSuperAdmin']) {
      this.router.navigate(['/dashboard']);
      return false;
    }

    if (token && role) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}


@Injectable({
  providedIn: 'root',
})

export class LoginAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = this.authService.currentToken || localStorage.getItem('token');
    const roleCode = this.authService.currentRoleCode || localStorage.getItem('roleCode');
        const mustChange = localStorage.getItem('mustChangePassword') === 'true'; 

    if (!token) {
      return true;
    }

    if (mustChange) {
      this.router.navigate(['/set-password']);
      return false;
    }
    if (roleCode === 'super_admin') {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      });
    } else if (roleCode) {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(['/user-dashboard'], { replaceUrl: true });
      });
    } else {
      this.router.navigate(['/login']);
    }
    return false;
  }
}
