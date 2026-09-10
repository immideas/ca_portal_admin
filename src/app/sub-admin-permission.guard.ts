import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SubAdminPermissionGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const roleCode = this.authService.currentRoleCode || localStorage.getItem('roleCode');

    if (roleCode === 'super_admin') {
      if (route.data['allowSuperAdmin']) {
        return true;
      }
      return this.router.createUrlTree(['/dashboard']);
    }

    const requiredPermission = route.data['permission'];

    if (Array.isArray(requiredPermission)) {
      console.error(
        `SubAdminPermissionGuard: route "${state.url}" still has an ARRAY permission ` +
        `(${JSON.stringify(requiredPermission)}). Sirf ek exact string permission allowed hai. ` +
        `routes.ts me is route ka data.permission fix karo.`
      );
      return this.router.createUrlTree(['/user-dashboard']);
    }

    const requiredStr: string | undefined = requiredPermission || undefined;

    if (!requiredStr) {
      return true;
    }

    let permissions: string[] = [];
    try {
      const stored = localStorage.getItem('permissions') || '';
      permissions = stored.split(',').map(p => p.trim()).filter(Boolean);
    } catch (error) {
      console.error('SubAdminPermissionGuard: unable to read permissions:', error);
      permissions = [];
    }

    if (permissions.includes(requiredStr)) {
      return true;
    }

    this.toastr.warning(
      "You don't have access to this page.",
      'Access Denied',
      {
        timeOut: 4000,
        closeButton: true,
        tapToDismiss: true,
        positionClass: 'toast-top-right'
      }
    );

    return this.router.createUrlTree(['/user-dashboard']);
  }
}