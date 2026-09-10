import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SUPER_ADMIN_NAV,
  DEFAULT_SUB_ADMIN_NAV,
  SidebarNavSection
} from '../common-sidebar/sidebar-nav.model';
import { CommonSidebarComponent } from '../common-sidebar/common-sidebar.component';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  standalone: true,
  imports: [CommonModule, CommonSidebarComponent]
})
export class SidebarComponent implements OnInit {
  navSections: SidebarNavSection[] = [];
  logoRoute = '/user-dashboard';

  ngOnInit(): void {
    const roleCode = localStorage.getItem('roleCode');

    if (roleCode === 'super_admin') {
      this.navSections = SUPER_ADMIN_NAV;
      this.logoRoute = '/dashboard';
    } else {
      this.navSections = DEFAULT_SUB_ADMIN_NAV;
      this.logoRoute = '/user-dashboard';
    }
  }
}
