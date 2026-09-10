import { Injectable } from '@angular/core';

export interface AppTheme {
  id: number;
  theme_name?: string;

  // Primary
  primary_color: string;
  primary_hover_color: string;

  // Sidebar
  sidebar_color: string;
  sidebar_active_color: string;
  sidebar_active_text_color: string;
  sidebar_text_color: string;
  sidebar_hover_color: string;
  sidebar_icon_color: string;
  sidebar_hover_bg_color: string;
  sidebar_border_color: string;

  // Navbar
  navbar_color: string;
  navbar_text_color: string;
  navbar_icon_color: string;
  navbar_hover_color: string;

  // Page / Card / Section
  page_background_color: string;
  card_background_color: string;
  card_border_color: string;
  section_header_color: string;

  // Input
  input_background_color: string;
  input_border_color: string;
  input_focus_background_color: string;
  input_disabled_background_color: string;

  // General
  text_color: string;
  label_color: string;
  muted_text_color: string;
  border_color: string;
  error_color: string;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeConfigService {

  /**
   * Apply backend ThemeConfiguration colors
   * as global --brand-* CSS variables.
   */
  applyTheme(theme: AppTheme | null | undefined): void {

    if (!theme) {
      this.clearTheme();
      return;
    }

    const root = document.documentElement.style;

    // ==========================================
    // PRIMARY
    // ==========================================

    root.setProperty(
      '--brand-primary',
      theme.primary_color
    );

    root.setProperty(
      '--brand-primary-hover',
      theme.primary_hover_color
    );


    // ==========================================
    // SIDEBAR
    // ==========================================

    root.setProperty(
      '--brand-sidebar-bg',
      theme.sidebar_color
    );

    root.setProperty(
      '--brand-sidebar-active-bg',
      theme.sidebar_active_color
    );

    root.setProperty(
      '--brand-sidebar-active-text',
      theme.sidebar_active_text_color
    );

    root.setProperty(
      '--brand-sidebar-text',
      theme.sidebar_text_color
    );

    root.setProperty(
      '--brand-sidebar-hover',
      theme.sidebar_hover_color
    );

    root.setProperty(
      '--brand-sidebar-icon',
      theme.sidebar_icon_color
    );

    root.setProperty(
      '--brand-sidebar-hover-bg',
      theme.sidebar_hover_bg_color
    );

    root.setProperty(
      '--brand-sidebar-border',
      theme.sidebar_border_color
    );


    // ==========================================
    // NAVBAR
    // ==========================================

    root.setProperty(
      '--brand-navbar-bg',
      theme.navbar_color
    );

    root.setProperty(
      '--brand-navbar-text',
      theme.navbar_text_color
    );

    root.setProperty(
      '--brand-navbar-icon',
      theme.navbar_icon_color
    );

    root.setProperty(
      '--brand-navbar-hover',
      theme.navbar_hover_color
    );


    // ==========================================
    // PAGE / CARD / SECTION
    // ==========================================

    root.setProperty(
      '--brand-page-bg',
      theme.page_background_color
    );

    root.setProperty(
      '--brand-card-bg',
      theme.card_background_color
    );

    root.setProperty(
      '--brand-card-border',
      theme.card_border_color
    );

    root.setProperty(
      '--brand-section-header',
      theme.section_header_color
    );


    // ==========================================
    // INPUT
    // ==========================================

    root.setProperty(
      '--brand-input-bg',
      theme.input_background_color
    );

    root.setProperty(
      '--brand-input-border',
      theme.input_border_color
    );

    root.setProperty(
      '--brand-input-focus-bg',
      theme.input_focus_background_color
    );

    root.setProperty(
      '--brand-input-disabled-bg',
      theme.input_disabled_background_color
    );


    // ==========================================
    // GENERAL TEXT / BORDER / ERROR
    // ==========================================

    root.setProperty(
      '--brand-text',
      theme.text_color
    );

    root.setProperty(
      '--brand-label',
      theme.label_color
    );

    root.setProperty(
      '--brand-muted-text',
      theme.muted_text_color
    );

    root.setProperty(
      '--brand-border',
      theme.border_color
    );

    root.setProperty(
      '--brand-error',
      theme.error_color
    );


    // ==========================================
    // Heading
    // ==========================================

    root.setProperty(
      '--brand-heading',
      theme.navbar_text_color
    );
  }


  /**
   * Remove all backend theme variables.
   */
  clearTheme(): void {

    const root = document.documentElement.style;

    [
      '--brand-primary',
      '--brand-primary-hover',

      '--brand-sidebar-bg',
      '--brand-sidebar-active-bg',
      '--brand-sidebar-active-text',
      '--brand-sidebar-text',
      '--brand-sidebar-hover',
      '--brand-sidebar-icon',
      '--brand-sidebar-hover-bg',
      '--brand-sidebar-border',

      '--brand-navbar-bg',
      '--brand-navbar-text',
      '--brand-navbar-icon',
      '--brand-navbar-hover',

      '--brand-page-bg',
      '--brand-card-bg',
      '--brand-card-border',
      '--brand-section-header',

      '--brand-input-bg',
      '--brand-input-border',
      '--brand-input-focus-bg',
      '--brand-input-disabled-bg',

      '--brand-text',
      '--brand-label',
      '--brand-muted-text',
      '--brand-border',
      '--brand-error',

      '--brand-heading',
    ].forEach((prop) => {
      root.removeProperty(prop);
    });
  }
}
