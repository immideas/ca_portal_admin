import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { UserPreferencesService } from '../common-sidebar/user-preferences.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-common-header',
  templateUrl: './common-header.component.html',
  styleUrls: ['./common-header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class CommonHeaderComponent implements OnInit, OnDestroy {
  @Output() refreshClicked = new EventEmitter<void>();

  userName = '';
  userInitial = '';
  roleCode = '';
  formattedRole = '';
  isCollapsed = false;
  themeClass = '';
  isRightSidebarOpen = false;
  notificationCount = 4;
  conversations: any[] = [];

  private sub = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private prefsService: UserPreferencesService,
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('name') ?? 'User';
    this.userInitial = this.userName.charAt(0).toUpperCase();
    this.roleCode = localStorage.getItem('roleCode') ?? '';
    this.formattedRole = this.roleCode.replace(/_/g, ' ');

    this.sub.add(
      this.prefsService.preferences$.subscribe((p) => {
        this.isCollapsed = p.sidebar_collapsed ?? false;
        this.themeClass = p.theme_mode ? `theme-${p.theme_mode}` : '';
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onToggleSidebar(): void {
    if (window.innerWidth <= 767) {
      const currentMobileState = this.prefsService.mobileSidebarOpen;
      this.prefsService.setMobileSidebarOpen(!currentMobileState);
    } else {
      const currentDesktopState = this.prefsService.current?.sidebar_collapsed ?? false;
      this.prefsService.setSidebarCollapsed(!currentDesktopState);
    }
  }

  toggleRightSidebar(): void {
    this.isRightSidebarOpen = !this.isRightSidebarOpen;
  }

  openChatFromNotification(convo: any): void {
  }

  onRefresh(): void {
    this.refreshClicked.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}
