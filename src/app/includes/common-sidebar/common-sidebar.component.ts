import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth.service';
import { SIDEBAR_ICONS } from './sidebar-icons';
import {
  DEFAULT_SUB_ADMIN_NAV,
  SidebarNavItem,
  SidebarNavSection,
  SidebarTheme,
  SidebarNavChild,
} from './sidebar-nav.model';
import { SidebarThemeService } from '../common-sidebar/sidebar-theme.service';
import { UserPreferencesService } from '../common-sidebar/user-preferences.service';
import { UserPreferences, ThemeMode } from '../common-sidebar/user-preferences.model';

const RADIUS_MAP: Record<string, string> = {
  none: '0px',
  small: '4px',
  medium: '6px',
  large: '12px',
};

const PADDING_MAP: Record<string, string> = {
  compact: '6px 10px',
  comfortable: '10px 12px',
  spacious: '14px 16px',
};

@Component({
  selector: 'app-common-sidebar',
  templateUrl: './common-sidebar.component.html',
  styleUrls: ['./common-sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class CommonSidebarComponent implements OnInit, OnDestroy {
  @Input() navSections: SidebarNavSection[] = DEFAULT_SUB_ADMIN_NAV;
  @Input() logoText = 'Resolvenest';
  @Input() logoRoute = '/dashboard';

  prefs!: UserPreferences;
  themes: UserPreferences[] = [];
  mobileOpen = false;
  activePopup: string | null = null;

  moreDrawerOpen = false;
  popupTop = 0;

  get themeClass(): string {
    return `theme-${this.prefs?.theme_mode ?? 'light'}`;
  }

  get isCollapsed(): boolean {
    return this.prefs?.sidebar_collapsed ?? false;
  }
get sidebarStyles(): Record<string, string> {
  if (!this.prefs) {
    return {};
  }

  const radius =
    RADIUS_MAP[this.prefs.border_radius] ?? '6px';

  const padding =
    PADDING_MAP[this.prefs.density] ?? '10px 12px';

  const styles: Record<string, string> = {
    '--sb-link-radius': radius,
    '--sb-link-padding': padding,
    '--sb-font-scale': String(
      this.prefs.font_scaling_factor ?? 1
    ),
    '--sb-font-family': 'var(--font-body)',
  };

  if (this.prefs.reduce_motion) {
    styles['--sb-transition-duration'] = '0ms';
  }

  return styles;
}

  permissions: string[] = [];
  expandedItems = new Set<string>();
  private sub = new Subscription();

  constructor(
    private sanitizer: DomSanitizer,
    private themeService: SidebarThemeService,
    private prefsService: UserPreferencesService,
    private authService: AuthService,
    private router: Router,

  ) {}

  ngOnInit(): void {
  this.sub.add(
    this.authService.permissions.subscribe((permStr) => {
      this.permissions = permStr
        ? permStr.split(',').map(p => p.trim()).filter(Boolean)
        : [];
    })
  );
    this.sub.add(
      this.prefsService.preferences$.subscribe((p) => {
        this.prefs = p;
        if (p?.theme_mode) {
          this.themeService.setTheme(p.theme_mode as SidebarTheme);
        }
      })
    );

    this.sub.add(
      this.prefsService.mobileSidebarOpen$.subscribe((open) => {
        this.mobileOpen = open;
      })
    );

    this.autoExpandActive();
    this.sub.add(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.autoExpandActive();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }



isVisible(item: SidebarNavItem): boolean {
  if (!this.hasPermission(item.permission)) return false;

  if (item.children?.length) {
    return item.children.some(child => this.hasPermission(child.permission));
  }
  return true;
}

isChildVisible(child: SidebarNavChild): boolean {
  return this.hasPermission(child.permission);
}

  hasPermission(perm?: string): boolean {
    if (!perm) return true;
    return this.permissions.includes(perm);
  }

  hasChildren(item: SidebarNavItem): boolean {
    return !!item.children?.length;
  }

  toggleExpand(id: string): void {
    if (this.expandedItems.has(id)) {
      this.expandedItems.delete(id);
    } else {
      this.expandedItems.add(id);
    }
  }

toggleCollapse(): void {
  const collapsed = !this.isCollapsed;

  if (collapsed) {
    this.expandedItems.clear();
    this.activePopup = null;
  }

  this.prefsService.setSidebarCollapsed(collapsed);
}

  onParentClick(id: string): void {
    if (this.isCollapsed) {
      this.activePopup = this.activePopup === id ? null : id;
    } else {
      this.toggleExpand(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedItems.has(id);
  }

  isItemActive(item: SidebarNavItem): boolean {
    if (item.route) {
      return this.router.isActive(item.route, { paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' });
    }
    return this.isChildRouteActive(item);
  }

  switchTheme(mode: ThemeMode): void {
    this.prefsService.setThemeMode(mode);
  }

  closeMobile(): void {
    this.prefsService.setMobileSidebarOpen(false);
  }


setPopupPosition(event: MouseEvent, id: string): void {
  if (!this.isCollapsed) return;

  this.activePopup = id;

  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  const popupHeight = 250;
  const viewportHeight = window.innerHeight;

  this.popupTop =
    rect.top + popupHeight > viewportHeight
      ? viewportHeight - popupHeight - 10
      : rect.top;
}
  showPopup(id: string) {
    if (this.isCollapsed) {
      this.activePopup = id;
    }
  }

  hidePopup() {
    this.activePopup = null;
  }

  keepPopupOpen(id: string) {
    this.activePopup = id;
  }

  openMoreDrawer(): void {
    this.moreDrawerOpen = true;
  }

  closeMoreDrawer(): void {
    this.moreDrawerOpen = false;
  }

  logout(): void {
    this.authService.logout();
  }

  isChildRouteActive(item: SidebarNavItem): boolean {
    return (item.children ?? []).some((c) =>
      (c.activeRoutes ?? [c.route]).some((route) =>
        this.router.isActive(route, { paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' })
      )
    );
  }

  isChildExactActive(child: SidebarNavChild): boolean {
    const routes = child.activeRoutes ?? [child.route];
    const currentUrl = this.router.url.split('?')[0];
    return routes.some((route) => {
      if (currentUrl === route) return true;
      if (currentUrl.startsWith(route + '/') && !this.isMoreSpecificRouteActive(child, currentUrl)) {
        return true;
      }
      return false;
    });
  }

  private isMoreSpecificRouteActive(child: SidebarNavChild, currentUrl: string): boolean {
    return this.navSections.some((section) =>
      section.items.some((item) =>
        item.children?.some((c) => c !== child && (c.activeRoutes ?? [c.route]).some((r) => currentUrl.startsWith(r + '/')))
      )
    );
  }


  private autoExpandActive(): void {

  if (this.isCollapsed) {
    return;
  }

  this.navSections.forEach((section) => {
    section.items.forEach((item) => {
      if (this.hasChildren(item) && this.isChildRouteActive(item)) {
        this.expandedItems.add(item.id);
      }
    });
  });
}
  toggleItem(id: string): void {
  if (this.expandedItems.has(id)) {
    this.expandedItems.delete(id);
  } else {
    this.expandedItems.add(id);
  }
}

getSvgIcon(iconName: string): SafeHtml {
  const cleanName = iconName.replace('svg:', '');
  const rawSvg = SIDEBAR_ICONS[cleanName] || '';
  return this.sanitizer.bypassSecurityTrustHtml(rawSvg);
}
}
