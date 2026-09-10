import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SidebarTheme } from './sidebar-nav.model';

@Injectable({ providedIn: 'root' })
export class SidebarThemeService {
  private readonly STORAGE_KEY = 'sidebar_theme';
  private themeSubject = new BehaviorSubject<SidebarTheme>(this.getInitialTheme());

  readonly theme$ = this.themeSubject.asObservable();

  get currentTheme(): SidebarTheme {
    return this.themeSubject.value;
  }

  setTheme(theme: SidebarTheme): void {
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.themeSubject.next(theme);
  }

  private getInitialTheme(): SidebarTheme {
    const stored = localStorage.getItem(this.STORAGE_KEY) as SidebarTheme;
    if (stored === 'dark' || stored === 'high-contrast') return stored;
    return 'light';
  }
}
