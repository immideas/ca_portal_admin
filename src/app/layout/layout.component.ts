import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { RoleService } from '../services/role.service';
import { UserService } from '../services/user.service';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { CommonHeaderComponent } from '../includes/common-header/common-header.component';
import { SidebarComponent } from '../includes/sidebar/sidebar.component';
import { UserPreferencesService } from '../includes/common-sidebar/user-preferences.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SocketService } from '../services/socketpermission.service';
import { ToastrService } from 'ngx-toastr';
import { ThemeConfigService } from '../services/theme-config.service';
import { ThemeConfigurationService } from '../services/theme-configuration.service'; // 👈 NEW — theme:updated event ke baad naya theme fetch karne ke liye
@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, NgxChartsModule, CommonHeaderComponent, SidebarComponent]
})
export class LayoutComponent implements OnInit, OnDestroy {
  userName: string | null = null;
  role: string | null = localStorage.getItem('role');
  public roleCode: string | null = localStorage.getItem('roleCode');
  roles: any[] = [];

  permissions: string[] = this.getCachedPermissions();
  adminPermissions: string[] = this.getCachedPermissions();

  isCollapsed = false;
  themeClass = '';
  private sub = new Subscription();

  private permissionsToastId: number | null = null;

  private pendingPermissionUpdate = false;


  private pendingPermissions: string[] | null = null;

  // 👇 NAYA — theme:updated ke liye bilkul permissions wala hi pattern
  private themeToastId: number | null = null;
  private pendingThemeUpdate = false;
  private pendingTheme: any = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private roleService: RoleService,
    private userService: UserService,
    private prefsService: UserPreferencesService,
    private socketService: SocketService,
    private toastr: ToastrService,
    private themeConfigService: ThemeConfigService,
    private themeConfigurationService: ThemeConfigurationService // 👈 NEW

  ) { }

  private getCachedPermissions(): string[] {
    const cached = localStorage.getItem('permissions');
    return cached ? cached.split(',').map(p => p.trim()).filter(Boolean) : [];
  }

  ngOnInit(): void {
   // 👇 NAYA — AuthService.theme observable subscribe karo (login pe
    // set hota hai, refresh pe localStorage se already seeded hota hai,
    // aur logout pe null ho jaata hai — teeno cases yahan se cover ho
    // jaate hain, bina khud localStorage chhue).
    this.sub.add(
      this.authService.theme.subscribe((theme) => {
            console.log('CURRENT THEME:', theme);

        this.themeConfigService.applyTheme(theme);
      })
    );
    this.sub.add(
      this.prefsService.preferences$.subscribe(p => {
        this.isCollapsed = p.sidebar_collapsed ?? false;
        this.applySidebarClass(this.isCollapsed);
        this.themeClass = p.theme_mode ? `theme-${p.theme_mode}` : '';
        this.applyGlobalThemeClass(p.theme_mode);
      })
    );

    this.authService.name.subscribe(name => {
      this.userName = name;
    });

    this.roleService.listAllRoles().subscribe(
      (roles) => { this.roles = roles; },
      (error) => console.error('Error fetching roles:', error)
    );

    this.socketService.onPermissionsUpdated((data) => {
      console.log('Permission update signal received:', data);
      this.silentlyFetchPermissions();
    });


this.socketService.onThemeUpdated((data) => {
  console.log('Theme update signal received:', data);

  if (!data?.themeId) {
    return;
  }

  const updatedThemeId = Number(data.themeId);
  const currentThemeId = Number(this.authService.currentTheme?.id);

  if (
    Number.isFinite(updatedThemeId) &&
    Number.isFinite(currentThemeId) &&
    updatedThemeId === currentThemeId
  ) {
    console.log(
      'Theme already applied locally. Ignoring duplicate socket event:',
      updatedThemeId
    );

    return;
  }

  this.silentlyFetchTheme(updatedThemeId);
});


    this.sub.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        if (this.pendingPermissionUpdate) {
          this.applyPendingPermissions();
        }
        if (this.pendingThemeUpdate) {
          this.applyPendingTheme();
        }
      })
    );
  }


  private silentlyFetchTheme(themeId: number): void {
    this.themeConfigurationService.getThemeById(themeId).subscribe({
      next: (res: any) => {
        const theme = res?.data || res?.theme || res;

        this.pendingTheme = theme;

        if (this.themeToastId !== null) {
          this.toastr.remove(this.themeToastId);
          this.themeToastId = null;
        }

        const toastRef = this.toastr.warning(
          'Your theme has been updated. Click here to apply it.',
          'Theme updated',
          {
            disableTimeOut: true,
            tapToDismiss: false,
            closeButton: true,
            positionClass: 'toast-top-right'
          }
        );

        this.themeToastId = toastRef.toastId;
        this.pendingThemeUpdate = true;

        toastRef.onTap.subscribe(() => {
          this.applyPendingTheme();
        });
      },
      error: (err) => {
        console.error('Silent theme fetch failed:', err);
      }
    });
  }

  private applyPendingTheme(): void {
    if (this.pendingTheme === null) return;
    this.authService.setTheme(this.pendingTheme);
    this.pendingTheme = null;
    this.dismissThemeToast();
  }

  private dismissThemeToast(): void {
    if (this.themeToastId !== null) {
      this.toastr.remove(this.themeToastId);
      this.themeToastId = null;
    }
    this.pendingThemeUpdate = false;
  }

  private silentlyFetchPermissions(): void {
    this.userService.getMyPermissions().subscribe({
      next: (res) => {
        const permissions = Array.isArray(res.permissions)
          ? res.permissions
          : (typeof res.permissions === 'string'
              ? res.permissions.split(',').map((p: string) => p.trim()).filter(Boolean)
              : []);


        this.pendingPermissions = permissions;

        if (this.permissionsToastId !== null) {
          this.toastr.remove(this.permissionsToastId);
          this.permissionsToastId = null;
        }

        const toastRef = this.toastr.warning(
          'Your access has changed. Click here to refresh and apply it.',
          'Permissions updated',
          {
            disableTimeOut: true,
            tapToDismiss: false,
            closeButton: true,
            positionClass: 'toast-top-right'
          }
        );

        this.permissionsToastId = toastRef.toastId;
        this.pendingPermissionUpdate = true;


      toastRef.onTap.subscribe(() => {
  const redirected = this.applyPendingPermissions();
  if (!redirected) {
    this.refreshCurrentRoute();
  }
});
      },
      error: (err) => {
        console.error('Silent permission fetch failed:', err);
      }
    });
  }


 private applyPendingPermissions(): boolean {
  if (this.pendingPermissions === null) return false;
  const newPermissions = this.pendingPermissions;
  this.setPermissions(newPermissions);
  this.pendingPermissions = null;
  this.dismissPermissionToast();
  this.authService.notifyPermissionsRefreshed();
  return this.enforceCurrentRoutePermission(newPermissions);
}

private enforceCurrentRoutePermission(permissions: string[]): boolean {
  const requiredPermission = this.getCurrentRouteRequiredPermission();
  if (requiredPermission && !permissions.includes(requiredPermission)) {
    this.router.navigate(['/user-dashboard']);
    return true;
  }
  return false;
}
private getCurrentRouteRequiredPermission(): string | undefined {
  let snapshot = this.router.routerState.snapshot.root;
  while (snapshot.firstChild) {
    snapshot = snapshot.firstChild;
  }
  return snapshot.data?.['permission'];
}

  private dismissPermissionToast(): void {
    if (this.permissionsToastId !== null) {
      this.toastr.remove(this.permissionsToastId);
      this.permissionsToastId = null;
    }
    this.pendingPermissionUpdate = false;
  }

  private refreshCurrentRoute(): void {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  private setPermissions(permissions: string[]): void {
    this.permissions = permissions;
    this.adminPermissions = permissions;

    this.authService.setPermissions(permissions.join(','));

    localStorage.setItem('permissions', permissions.join(','));
  }

  ngOnDestroy(): void {
    this.socketService.offPermissionsUpdated();
    this.socketService.offThemeUpdated(); // 👈 NEW
    this.sub.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
  }

  isActive(urlPattern: string): boolean {
    const currentUrl = decodeURIComponent(this.router.url);
    const patternRegex = this.createRouteRegex(urlPattern);
    return patternRegex.test(currentUrl);
  }

  toggleSidebar(): void {
    this.prefsService.setSidebarCollapsed(!this.isCollapsed);
  }

  private applyGlobalThemeClass(themeMode: string): void {
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast');
    if (themeMode === 'dark') {
      document.body.classList.add('theme-dark');
    } else if (themeMode === 'high-contrast') {
      document.body.classList.add('theme-high-contrast');
    } else {
      document.body.classList.add('theme-light');
    }
  }

  private createRouteRegex(urlPattern: string): RegExp {
    const regexPattern = urlPattern.replace(/:\w+/g, '[A-Za-z0-9+/=]+');
    return new RegExp('^' + regexPattern + '$');
  }
  private applySidebarClass(isCollapsed: boolean): void {
    if (isCollapsed) {
      document.body.classList.add('toggle-sidebar');
    } else {
      document.body.classList.remove('toggle-sidebar');
    }
  }
}
