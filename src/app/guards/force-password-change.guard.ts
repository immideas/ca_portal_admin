import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class ForcePasswordChangeGuard implements CanActivate, CanActivateChild {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.check();
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.check();
  }

  private check(): boolean {
    const mustChange = localStorage.getItem('mustChangePassword') === 'true';
    if (mustChange) {
      this.router.navigate(['/set-password']);
      return false;
    }
    return true;
  }
}