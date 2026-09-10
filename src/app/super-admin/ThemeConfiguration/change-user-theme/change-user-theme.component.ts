import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService, ToastrModule } from 'ngx-toastr';
import { firstValueFrom, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { ThemeConfigurationService } from '../../../services/theme-configuration.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../auth.service';
import { ColorMethodSelectorComponent } from '@swiftlyme/color-spotter';

@Component({
  selector: 'app-change-user-theme',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxUiLoaderModule,
    ToastrModule,
    ColorMethodSelectorComponent,
  ],
  templateUrl: './change-user-theme.component.html',
  styleUrl: './change-user-theme.component.css',
})
export class ChangeUserThemeComponent implements OnInit, OnDestroy {
  // =====================================================
  // USER / ROLE
  // =====================================================

  loggedInUserId: number | null = null;
  userId: number | null = null;
  targetAdmin: any = null;

  isSuperAdmin = false;
  isAdmin = false;

  /** Super Admin flow: /change-user-theme/:adminId */
  isSuperAdminTargetFlow = false;

  /** Admin flow: /choose-theme or /customize-theme */
  isAdminChooseThemeFlow = false;

  // =====================================================
  // THEMES
  // =====================================================

  themes: any[] = [];

  selectedThemeId: number | null = null;
  selectedTheme: any = null;

  currentThemeId: number | null = null;

  // =====================================================
  // ADMIN CUSTOM THEME
  // =====================================================

  /**
   * Admin can have ONLY ONE custom theme.
   * - customThemeId set    -> editing an existing theme
   * - customThemeId null   -> creating a new theme
   */
  customThemeId: number | null = null;

  customTheme: any = {
    theme_name: '',
    description: '',

    primary_color: '#4F46E5',
    primary_hover_color: '#4338CA',

    sidebar_color: '#ECF4FF',
    sidebar_active_color: '#4C91EE',
    sidebar_active_text_color: '#FFFFFF',
    sidebar_text_color: '#111827',
    sidebar_hover_color: '#4154F1',
    sidebar_icon_color: '#4154F1',
    sidebar_hover_bg_color: '#F3F6FF',
    sidebar_border_color: '#E5E7EB',

    navbar_color: '#FFFFFF',
    navbar_text_color: '#111827',
    navbar_icon_color: '#012970',
    navbar_hover_color: '#4154F1',

    page_background_color: '#F8FAFF',
    card_background_color: '#FFFFFF',
    card_border_color: '#D6E4FF',
    section_header_color: '#F1F5FF',

    input_background_color: '#F9FAFB',
    input_border_color: '#EEF2F7',
    input_focus_background_color: '#EEF4FF',
    input_disabled_background_color: '#F3F4F6',

    text_color: '#1F2937',
    label_color: '#6B7280',
    muted_text_color: '#9CA3AF',

    border_color: '#E5E7EB',
    error_color: '#DC2626',
  };

  // =====================================================
  // UI MODE
  // =====================================================

  /**
   * Admin can switch between:
   *  - change    -> choose an existing Super Admin theme
   *  - customize -> create/edit their own custom theme
   * Super Admin only ever gets 'change'.
   */
  themeMode: 'change' | 'customize' = 'change';

  get isCustomizeMode(): boolean {
    return this.themeMode === 'customize';
  }

  /**
   * Back button is only shown for the Super Admin target flow
   * (/change-user-theme/:adminId), where it always returns to
   * /manage-admins. The admin's own self-service flow
   * (/choose-theme, /customize-theme) has nothing to "go back"
   * to within this section, so the back button stays hidden there.
   */
  get showBackButton(): boolean {
    return this.isSuperAdminTargetFlow;
  }

  // =====================================================
  // COLOR FIELDS
  // =====================================================

  colorFieldMeta: { key: string; label: string }[] = [
    { key: 'primary_color', label: 'Primary Color' },
    { key: 'primary_hover_color', label: 'Primary Hover Color' },

    { key: 'sidebar_color', label: 'Sidebar Color' },
    { key: 'sidebar_active_color', label: 'Sidebar Active Color' },
    { key: 'sidebar_active_text_color', label: 'Sidebar Active Text' },
    { key: 'sidebar_text_color', label: 'Sidebar Text Color' },
    { key: 'sidebar_hover_color', label: 'Sidebar Hover Color' },
    { key: 'sidebar_icon_color', label: 'Sidebar Icon Color' },
    { key: 'sidebar_hover_bg_color', label: 'Sidebar Hover Background' },
    { key: 'sidebar_border_color', label: 'Sidebar Border Color' },

    { key: 'navbar_color', label: 'Navbar Color' },
    { key: 'navbar_text_color', label: 'Navbar Text Color' },
    { key: 'navbar_icon_color', label: 'Navbar Icon Color' },
    { key: 'navbar_hover_color', label: 'Navbar Hover Color' },

    { key: 'page_background_color', label: 'Page Background' },
    { key: 'card_background_color', label: 'Card Background' },
    { key: 'card_border_color', label: 'Card Border Color' },
    { key: 'section_header_color', label: 'Section Header Background' },

    { key: 'input_background_color', label: 'Input Background' },
    { key: 'input_border_color', label: 'Input Border Color' },
    { key: 'input_focus_background_color', label: 'Input Focus Background' },
    { key: 'input_disabled_background_color', label: 'Input Disabled Background' },

    { key: 'text_color', label: 'Text Color' },
    { key: 'label_color', label: 'Label Color' },
    { key: 'muted_text_color', label: 'Muted Text Color' },

    { key: 'border_color', label: 'Border Color' },
    { key: 'error_color', label: 'Error Color' },
  ];

  /**
   * Groups colorFieldMeta into named sections so the template can
   * render one card per category instead of one flat 27-field list.
   * Keys below MUST line up 1:1 with colorFieldMeta above — if a new
   * field is added there, add it to a group here too, or it silently
   * won't render anywhere.
   *
   * 👇 IMPORTANT — this is a computed-ONCE field, NOT a getter.
   * A `get colorGroups()` getter is re-evaluated by Angular on EVERY
   * change-detection cycle and (because it used .map()/.filter()) was
   * returning a brand-new array of brand-new objects each time. With
   * *ngFor and no trackBy, Angular treated that as "all new items" on
   * every single check, so it destroyed and recreated all 27
   * <color-selection-method> child components on every CD cycle. If
   * that component emits `colorPicked` on init, that emission itself
   * triggers another CD cycle -> another full recreate -> emit again,
   * forever. That infinite create/destroy/emit loop is what froze the
   * browser as soon as the Colors cards rendered (customize-theme
   * only, since choose-theme never renders this block).
   *
   * A plain field computed once here keeps the SAME array/object
   * references for the component's whole lifetime, so *ngFor has
   * nothing to "change" between cycles and the loop can't start.
   */
  readonly colorGroups: { name: string; icon: string; fields: { key: string; label: string }[] }[] =
    this.buildColorGroups();

  private buildColorGroups(): { name: string; icon: string; fields: { key: string; label: string }[] }[] {
    const byKey = new Map(this.colorFieldMeta.map((f) => [f.key, f]));
    const pick = (keys: string[]) =>
      keys.map((k) => byKey.get(k)).filter((f): f is { key: string; label: string } => !!f);

    return [
      {
        name: 'Primary',
        icon: 'bi-palette',
        fields: pick(['primary_color', 'primary_hover_color']),
      },
      {
        name: 'Sidebar',
        icon: 'bi-layout-sidebar',
        fields: pick([
          'sidebar_color',
          'sidebar_active_color',
          'sidebar_active_text_color',
          'sidebar_text_color',
          'sidebar_hover_color',
          'sidebar_icon_color',
          'sidebar_hover_bg_color',
          'sidebar_border_color',
        ]),
      },
      {
        name: 'Navbar',
        icon: 'bi-menu-button-wide',
        fields: pick([
          'navbar_color',
          'navbar_text_color',
          'navbar_icon_color',
          'navbar_hover_color',
        ]),
      },
      {
        name: 'Layout & Cards',
        icon: 'bi-window',
        fields: pick([
          'page_background_color',
          'card_background_color',
          'card_border_color',
          'section_header_color',
        ]),
      },
      {
        name: 'Inputs',
        icon: 'bi-input-cursor-text',
        fields: pick([
          'input_background_color',
          'input_border_color',
          'input_focus_background_color',
          'input_disabled_background_color',
        ]),
      },
      {
        name: 'Text & Borders',
        icon: 'bi-fonts',
        fields: pick([
          'text_color',
          'label_color',
          'muted_text_color',
          'border_color',
          'error_color',
        ]),
      },
    ];
  }

  // =====================================================
  // COLOR GROUP ACCORDION STATE (same pattern as add-theme)
  // First group open by default, rest collapsed.
  // =====================================================

  openColorGroups: Set<number> = new Set([0]);

  toggleColorGroup(index: number): void {
    if (this.openColorGroups.has(index)) {
      this.openColorGroups.delete(index);
    } else {
      this.openColorGroups.add(index);
    }
  }

  isColorGroupOpen(index: number): boolean {
    return this.openColorGroups.has(index);
  }

  // =====================================================
  // UI STATE
  // =====================================================

  loading = false;
  saving = false;
  apiError = '';

  /**
   * Theme Preview card starts collapsed — user has to click the
   * toggle arrow to open it, instead of it always being expanded.
   */
  previewExpanded = false;

  togglePreview(): void {
    this.previewExpanded = !this.previewExpanded;
  }

  /**
   * Whichever theme the preview panel should render:
   * - customize mode -> live edits from customTheme (color pickers)
   * - change mode     -> whatever theme is currently selected in the dropdown
   */
  get previewTheme(): any {
    return this.isCustomizeMode ? this.customTheme : this.selectedTheme;
  }

  // =====================================================
  // THEME PERMISSION / ACCESS
  // =====================================================

  canChooseTheme = false;
  canCustomizeTheme = false;

  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private themeConfigService: ThemeConfigurationService,
    private userService: UserService,
    private authService: AuthService,
    private ngxLoader: NgxUiLoaderService,
    private toastr: ToastrService
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  private routeSub?: Subscription;

  ngOnInit(): void {
    // Run once for the route this component was first created on...
    this.initFromRoute();

    // ...and again on every subsequent navigation. Angular can reuse
    // THIS SAME component instance when moving between sibling routes
    // that render the same component (/choose-theme <-> /customize-theme,
    // or opening /change-user-theme/:adminId for a different admin) —
    // in that case ngOnInit() does NOT fire again, and without this
    // subscription the page keeps showing whatever was loaded for the
    // PREVIOUS route while the URL in the address bar has already changed.
    this.routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.initFromRoute());
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private initFromRoute(): void {
    // Reset per-route state so a stale flag/value from the previous
    // route can never leak into the newly-activated one.
    this.apiError = '';
    this.isSuperAdminTargetFlow = false;
    this.isAdminChooseThemeFlow = false;
    this.targetAdmin = null;
    this.selectedThemeId = null;
    this.selectedTheme = null;
    this.currentThemeId = null;
    this.customThemeId = null;
    this.previewExpanded = false;
    this.openColorGroups = new Set([0]);

    const role = localStorage.getItem('role');

    this.isSuperAdmin = role === '1';
    this.isAdmin = role === '2' || role === '3';

    const loggedInId = localStorage.getItem('user_id');

    if (loggedInId) {
      this.loggedInUserId = Number(loggedInId);
    }

    this.detectFlow();
    this.setPermissionFlags();

    if (!this.userId) {
      this.apiError = 'User ID not found.';
      return;
    }

    this.getThemes();
    this.getCurrentUserTheme();
  }

  // =====================================================
  // DETECT FLOW
  // =====================================================

  private detectFlow(): void {
    // 👇 FIX — this used to check `this.router.url.startsWith(...)`,
    // which reads Angular's GLOBAL, mutable current-URL state. That
    // value isn't guaranteed to be settled to the NEW url at the exact
    // moment this runs, so it was intermittently still evaluating the
    // route you were navigating AWAY from (URL bar changes, but this
    // component keeps deciding it's still on the old route/mode).
    //
    // `this.route.snapshot.routeConfig?.path` is scoped to THIS
    // specific route activation ('choose-theme' / 'customize-theme' /
    // 'change-user-theme/:adminId') — it's always correct for whichever
    // route just activated this component, regardless of any global
    // router-state timing.
    const routePath = this.route.snapshot.routeConfig?.path ?? '';
    const adminIdParam = this.route.snapshot.paramMap.get('adminId');

    // ===================================================
    // SUPER ADMIN FLOW
    // /change-user-theme/:adminId
    // ===================================================
    if (this.isSuperAdmin && routePath.startsWith('change-user-theme') && adminIdParam) {
      const targetAdminId = Number(adminIdParam);

      if (!targetAdminId || isNaN(targetAdminId)) {
        this.apiError = 'Invalid admin information.';
        return;
      }

      this.userId = targetAdminId;

      this.isSuperAdminTargetFlow = true;
      this.isAdminChooseThemeFlow = false;

      // Super Admin ALWAYS only changes an existing theme.
      this.themeMode = 'change';

      console.log('SUPER ADMIN THEME FLOW', 'Target Admin:', this.userId);

      return;
    }

    // ===================================================
    // ADMIN FLOW
    // /choose-theme or /customize-theme
    // ===================================================
    if (
      this.isAdmin &&
      (routePath === 'choose-theme' || routePath === 'customize-theme')
    ) {
      if (!this.loggedInUserId) {
        this.apiError = 'Logged-in user not found.';
        return;
      }

      this.userId = this.loggedInUserId;

      this.isAdminChooseThemeFlow = true;
      this.isSuperAdminTargetFlow = false;

      // Route decides initial mode.
      this.themeMode = routePath === 'customize-theme' ? 'customize' : 'change';

      console.log(
        'ADMIN THEME FLOW',
        'Admin:',
        this.userId,
        'Mode:',
        this.themeMode
      );

      return;
    }

    // ===================================================
    // INVALID FLOW
    // ===================================================
    this.apiError = 'Invalid theme route or user role.';
  }

  // =====================================================
  // PERMISSION FLAGS
  // =====================================================

  /**
   * Sets canChooseTheme / canCustomizeTheme.
   *
   * Super Admin target flow (/change-user-theme/:adminId) is
   * gated by SuperAdminAuthGuard only — it always may assign an
   * existing theme, and never customizes.
   *
   * Admin self-service flow (/choose-theme, /customize-theme) is
   * gated by SubAdminPermissionGuard on the route itself, but the
   * component still checks the same permissions so that a link
   * pointing at the wrong mode never renders actions the admin
   * doesn't actually have.
   */
  private setPermissionFlags(): void {
    if (this.isSuperAdminTargetFlow) {
      this.canChooseTheme = true;
      this.canCustomizeTheme = false;
      return;
    }

    const perms = (localStorage.getItem('permissions') || '')
      .split(',')
      .map((permission) => permission.trim());

    this.canChooseTheme = perms.includes('manage_choose_theme');
    this.canCustomizeTheme = perms.includes('manage_customize_theme');
  }

  // =====================================================
  // GET ALL THEMES
  // =====================================================

  async getThemes(): Promise<void> {
    this.loading = true;
    this.apiError = '';
    this.ngxLoader.start();

    try {
      const response: any = await firstValueFrom(
        this.themeConfigService.listAllThemes({})
      );

      if (Array.isArray(response)) {
        this.themes = response;
      } else if (Array.isArray(response?.data)) {
        this.themes = response.data;
      } else if (Array.isArray(response?.rows)) {
        this.themes = response.rows;
      } else {
        this.themes = [];
      }

      // Re-select the current theme once themes are loaded.
      if (this.currentThemeId !== null) {
        this.selectTheme(this.currentThemeId);
      }
    } catch (error: any) {
      console.error('GET THEMES ERROR:', error);

      this.apiError = error?.error?.message || 'Unable to load themes.';
      this.toastr.error(this.apiError);
    } finally {
      this.loading = false;
      this.ngxLoader.stop();
    }
  }

  // =====================================================
  // GET CURRENT USER / ADMIN
  // =====================================================

  async getCurrentUserTheme(): Promise<void> {
    if (!this.userId) {
      return;
    }

    try {
      const response: any = await firstValueFrom(
        this.userService.getUserById(String(this.userId))
      );

      const user = response?.data || response;
      this.targetAdmin = user;

      // -----------------------------------------------
      // Current assigned theme
      // -----------------------------------------------
      if (user?.theme_id !== undefined && user?.theme_id !== null) {
        this.currentThemeId = Number(user.theme_id);
        this.selectedThemeId = this.currentThemeId;
      } else {
        this.currentThemeId = null;
        this.selectedThemeId = null;
      }

      // -----------------------------------------------
      // Load selected theme once themes are available
      // -----------------------------------------------
      if (this.themes.length > 0 && this.currentThemeId !== null) {
        this.selectTheme(this.currentThemeId);
      }

      // -----------------------------------------------
      // Admin's own custom theme
      // Admin can create ONLY ONE custom theme.
      // created_by = logged-in admin id
      // -----------------------------------------------
      if (this.isAdminChooseThemeFlow) {
        const ownCustomTheme = this.themes.find(
          (theme: any) => Number(theme?.created_by) === Number(this.userId)
        );

        if (ownCustomTheme) {
          this.customThemeId = Number(ownCustomTheme.id);
          this.loadCustomTheme(ownCustomTheme);
        }
      }
    } catch (error: any) {
      console.error('GET CURRENT USER THEME ERROR:', error);

      this.apiError = error?.error?.message || 'Unable to load user theme.';
      this.toastr.error(this.apiError);
    }
  }

  // =====================================================
  // LOAD CUSTOM THEME INTO FORM
  // =====================================================

  private loadCustomTheme(theme: any): void {
    this.customTheme = {
      theme_name: theme?.theme_name || '',
      description: theme?.description || '',

      primary_color: theme?.primary_color || '#4F46E5',
      primary_hover_color: theme?.primary_hover_color || '#4338CA',

      sidebar_color: theme?.sidebar_color || '#ECF4FF',
      sidebar_active_color: theme?.sidebar_active_color || '#4C91EE',
      sidebar_active_text_color: theme?.sidebar_active_text_color || '#FFFFFF',
      sidebar_text_color: theme?.sidebar_text_color || '#111827',
      sidebar_hover_color: theme?.sidebar_hover_color || '#4154F1',
      sidebar_icon_color: theme?.sidebar_icon_color || '#4154F1',
      sidebar_hover_bg_color: theme?.sidebar_hover_bg_color || '#F3F6FF',
      sidebar_border_color: theme?.sidebar_border_color || '#E5E7EB',

      navbar_color: theme?.navbar_color || '#FFFFFF',
      navbar_text_color: theme?.navbar_text_color || '#111827',
      navbar_icon_color: theme?.navbar_icon_color || '#012970',
      navbar_hover_color: theme?.navbar_hover_color || '#4154F1',

      page_background_color: theme?.page_background_color || '#F8FAFF',
      card_background_color: theme?.card_background_color || '#FFFFFF',
      card_border_color: theme?.card_border_color || '#D6E4FF',
      section_header_color: theme?.section_header_color || '#F1F5FF',

      input_background_color: theme?.input_background_color || '#F9FAFB',
      input_border_color: theme?.input_border_color || '#EEF2F7',
      input_focus_background_color:
        theme?.input_focus_background_color || '#EEF4FF',
      input_disabled_background_color:
        theme?.input_disabled_background_color || '#F3F4F6',

      text_color: theme?.text_color || '#1F2937',
      label_color: theme?.label_color || '#6B7280',
      muted_text_color: theme?.muted_text_color || '#9CA3AF',

      border_color: theme?.border_color || '#E5E7EB',
      error_color: theme?.error_color || '#DC2626',
    };
  }

  // =====================================================
  // SELECT THEME
  // =====================================================

  selectTheme(themeId: number): void {
    this.selectedThemeId = Number(themeId);

    this.selectedTheme =
      this.themes.find(
        (theme: any) => Number(theme.id) === this.selectedThemeId
      ) || null;
  }

  // =====================================================
  // SAVE EXISTING THEME
  // =====================================================

  async saveTheme(): Promise<void> {
    if (!this.userId) {
      this.apiError = 'User ID not found.';
      return;
    }

    if (!this.selectedThemeId) {
      this.apiError = 'Please select a theme.';
      this.toastr.error(this.apiError);
      return;
    }

    if (this.currentThemeId === this.selectedThemeId) {
      this.apiError = 'This theme is already assigned to the user.';
      this.toastr.warning(this.apiError);
      return;
    }

    this.saving = true;
    this.ngxLoader.start();

    try {
      await firstValueFrom(
        this.userService.updateUserTheme(
          this.userId,
          Number(this.selectedThemeId)
        )
      );

      this.currentThemeId = Number(this.selectedThemeId);

      // 👇 No success toaster, no navigation — theme applies silently
      // and the user stays on this same page.
      if (this.isAdminChooseThemeFlow && this.selectedTheme) {
        this.authService.setTheme(this.selectedTheme);
      }
    } catch (error: any) {
      console.error('UPDATE USER THEME ERROR:', error);

      this.apiError =
        error?.error?.message || 'Unable to update user theme.';
      this.toastr.error(this.apiError);
    } finally {
      this.saving = false;
      this.ngxLoader.stop();
    }
  }

  // =====================================================
  // CREATE / UPDATE ADMIN CUSTOM THEME
  // =====================================================
async saveCustomTheme(): Promise<void> {
  if (!this.userId) {
    this.apiError = 'User ID not found.';
    return;
  }

  if (!this.customTheme.theme_name?.trim()) {
    this.apiError = 'Theme name is required.';
    this.toastr.error(this.apiError);
    return;
  }

  this.saving = true;
  this.ngxLoader.start();

  const payload = {
    user_id: this.userId,
    theme_name: this.customTheme.theme_name.trim(),
    description: this.customTheme.description || null,

    primary_color: this.customTheme.primary_color,
    primary_hover_color: this.customTheme.primary_hover_color,

    sidebar_color: this.customTheme.sidebar_color,
    sidebar_active_color: this.customTheme.sidebar_active_color,
    sidebar_active_text_color: this.customTheme.sidebar_active_text_color,
    sidebar_text_color: this.customTheme.sidebar_text_color,
    sidebar_hover_color: this.customTheme.sidebar_hover_color,
    sidebar_icon_color: this.customTheme.sidebar_icon_color,
    sidebar_hover_bg_color: this.customTheme.sidebar_hover_bg_color,
    sidebar_border_color: this.customTheme.sidebar_border_color,

    navbar_color: this.customTheme.navbar_color,
    navbar_text_color: this.customTheme.navbar_text_color,
    navbar_icon_color: this.customTheme.navbar_icon_color,
    navbar_hover_color: this.customTheme.navbar_hover_color,

    page_background_color: this.customTheme.page_background_color,
    card_background_color: this.customTheme.card_background_color,
    card_border_color: this.customTheme.card_border_color,
    section_header_color: this.customTheme.section_header_color,

    input_background_color: this.customTheme.input_background_color,
    input_border_color: this.customTheme.input_border_color,
    input_focus_background_color:
      this.customTheme.input_focus_background_color,
    input_disabled_background_color:
      this.customTheme.input_disabled_background_color,

    text_color: this.customTheme.text_color,
    label_color: this.customTheme.label_color,
    muted_text_color: this.customTheme.muted_text_color,

    border_color: this.customTheme.border_color,
    error_color: this.customTheme.error_color,
  };

  try {
    let savedTheme: any;

    if (this.customThemeId) {

      // UPDATE EXISTING CUSTOM THEME
      await firstValueFrom(
        this.userService.updateCustomTheme(
          this.customThemeId,
          payload
        )
      );

      savedTheme = {
        id: this.customThemeId,
        ...payload
      };

      this.toastr.success(
        'Custom theme updated successfully.'
      );

    } else {

      // CREATE NEW CUSTOM THEME
      const response: any = await firstValueFrom(
        this.userService.customizeUserTheme(payload)
      );

      const newThemeId = response?.data?.theme?.id;

      if (newThemeId) {
        this.customThemeId = Number(newThemeId);
      }

      savedTheme =
        response?.data?.theme ||
        {
          id: newThemeId,
          ...payload
        };

      this.toastr.success(
        response?.message ||
        'Custom theme created successfully.'
      );
    }

    // APPLY IMMEDIATELY
    this.authService.setTheme(savedTheme);

    // IMPORTANT:
    // Do NOT navigate anywhere.
    // User remains on /customize-theme.

  } catch (error: any) {
    console.error('CUSTOM THEME ERROR:', error);

    this.apiError =
      error?.error?.message ||
      'Unable to save custom theme.';

    this.toastr.error(this.apiError);

  } finally {
    this.saving = false;
    this.ngxLoader.stop();
  }
}

  // =====================================================
  // TEMPLATE ALIAS
  // =====================================================

  saveCustomizedTheme(): void {
    this.saveCustomTheme();
  }

  // =====================================================
  // COLOR PICKER
  // =====================================================

  onColorPick(fieldKey: string, hex: string): void {
    this.customTheme[fieldKey] = hex;
  }

  // =====================================================
  // ADMIN INITIALS
  // =====================================================

  getAdminInitials(): string {
    const name =
      this.targetAdmin?.user_name ||
      this.targetAdmin?.name ||
      this.targetAdmin?.full_name ||
      '';

    if (!name) {
      return 'U';
    }

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  // =====================================================
  // ADMIN DISPLAY NAME
  // =====================================================

  getAdminDisplayName(): string {
    if (!this.targetAdmin) {
      return 'User';
    }

    const firstName =
      this.targetAdmin?.first_name || this.targetAdmin?.firstName || '';
    const lastName =
      this.targetAdmin?.last_name || this.targetAdmin?.lastName || '';

    const fullName = `${firstName} ${lastName}`.trim();

    return (
      fullName ||
      this.targetAdmin?.user_name ||
      this.targetAdmin?.username ||
      this.targetAdmin?.name ||
      this.targetAdmin?.full_name ||
      this.targetAdmin?.email ||
      'User'
    );
  }

  // =====================================================
  // THEME DESCRIPTION
  // =====================================================

  getThemeDescription(theme: any): string {
    if (!theme) {
      return '';
    }

    const name = (theme.theme_name || '').toLowerCase();

    if (name.includes('default') || name.includes('ocean')) {
      return 'Blue Theme';
    }

    if (name.includes('forest')) {
      return 'Green Theme';
    }

    if (name.includes('purple') || name.includes('royal')) {
      return 'Purple Theme';
    }

    if (name.includes('sunset') || name.includes('orange')) {
      return 'Orange Theme';
    }

    return 'Custom Theme';
  }

  // =====================================================
  // SUPER ADMIN / GLOBAL THEMES
  // =====================================================

  get defaultThemes(): any[] {
    // Super Admin target flow: show all available themes for assignment.
    if (this.isSuperAdminTargetFlow) {
      return this.themes;
    }

    // Admin flow: exclude the logged-in admin's own custom theme.
    return this.themes.filter(
      (theme: any) => Number(theme?.created_by) !== Number(this.loggedInUserId)
    );
  }

  // =====================================================
  // ADMIN'S OWN CUSTOM THEME
  // =====================================================

  get customThemes(): any[] {
    // Only the admin choose-theme flow should show the logged-in
    // admin's custom theme.
    if (!this.isAdminChooseThemeFlow) {
      return [];
    }

    return this.themes.filter(
      (theme: any) => Number(theme?.created_by) === Number(this.loggedInUserId)
    );
  }

  // =====================================================
  // BACK
  // =====================================================

  /**
   * Fixed destination instead of window.history.back() — history
   * back is unreliable here (deep link, refresh, or a redirect chain
   * can land the user somewhere unrelated). Each flow always goes
   * to one known place.
   */
  goBack(): void {
    if (this.isSuperAdminTargetFlow) {
      this.router.navigate(['/manage-admins']);
      return;
    }

    // Admin self-service flow has no back button in the UI, but
    // keep a safe fallback in case goBack() is ever called from
    // elsewhere (e.g. after a successful save).
    this.router.navigate(['/user-dashboard']);
  }

  isCurrentTheme(themeId: any): boolean {
    return Number(themeId) === Number(this.currentThemeId);
  }

  // trackBy for the color-group cards — belt-and-suspenders alongside
  // making colorGroups a stable, computed-once field above. Ensures
  // *ngFor identifies items by a stable key instead of object identity.
  trackByGroupName(_index: number, group: { name: string }): string {
    return group.name;
  }

  trackByFieldKey(_index: number, field: { key: string }): string {
    return field.key;
  }
}