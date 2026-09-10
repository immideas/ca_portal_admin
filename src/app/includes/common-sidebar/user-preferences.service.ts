import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  UserPreferences,
  LIGHT_PREFERENCES,
  THEME_PRESETS,
  ThemeMode,
} from './user-preferences.model';

const STORAGE_KEY = 'user_preferences';
const THEMES_CACHE_KEY = 'ui_themes_cache';


function toFontStack(name: string): string {
  const stacks: Record<string, string> = {
    'SF Pro Display':
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    Arial: 'Arial, Helvetica, sans-serif',
    Inter: "'Inter', 'Segoe UI', sans-serif",
    Roboto: "'Roboto', 'Segoe UI', sans-serif",
    'DM Sans': "'DM Sans', 'Segoe UI', sans-serif",
    Georgia: "Georgia, 'Times New Roman', serif",
    Montserrat: "'Montserrat', 'Segoe UI', sans-serif",
  };
  return stacks[name] ?? `'${name}', system-ui, sans-serif`;
}

function mapApiTheme(raw: any): UserPreferences {
  const rawName: string = raw.theme_mode ?? raw.name ?? 'light';
  const theme_mode = (
    rawName === 'high_contrast' ? 'high-contrast' : rawName
  ) as ThemeMode;
  return {
    id: Number(raw.id),
    user_id: raw.user_id ?? '',
    theme_mode,
    font_family: raw.font_family ?? raw.font ?? 'SF Pro Display',
    font_family_2: raw.font_family_2 ?? raw.font2 ?? undefined,
    primary_color: raw.primary_color,
    background_color: raw.background_color,
    text_color: raw.text_color,
    accent_color: raw.accent_color,
    reduce_motion: !!Number(raw.reduce_motion),
    increase_contrast: !!Number(raw.increase_contrast),
    font_scaling_factor: Number(raw.font_scaling_factor ?? 1),
    border_radius: raw.border_radius ?? 'medium',
    density: raw.density ?? 'comfortable',
    sidebar_collapsed: !!Number(raw.sidebar_collapsed),
    button_border_radius: raw.button_border_radius ?? 'medium',
    button_size: raw.button_size ?? 'md',
    button_variant: raw.button_variant ?? 'filled',
    button_primary_bg: raw.button_primary_bg,
    button_primary_text_color: raw.button_primary_text_color,
    button_hover_bg: raw.button_hover_bg,
    button_border_color: raw.button_border_color,
    button_border_width: Number(raw.button_border_width ?? 1),
    button_font_weight: raw.button_font_weight ?? 'medium',
    button_font_size: raw.button_font_size ?? 'md',
    button_shadow: raw.button_shadow ?? 'none',
    button_uppercase: !!Number(raw.button_uppercase),
    button_full_width: !!Number(raw.button_full_width),
    button_icon_position: raw.button_icon_position ?? 'left',
    button_high_contrast_border: !!Number(raw.button_high_contrast_border),
    button_focus_ring_color: raw.button_focus_ring_color,
    button_focus_ring_width: Number(raw.button_focus_ring_width ?? 2),
    button_disabled_opacity: Number(raw.button_disabled_opacity ?? 0.5),
    use_system_theme: !!Number(raw.use_system_theme),
    is_default: !!Number(raw.is_default),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private prefsSubject = new BehaviorSubject<UserPreferences>(
    this.getInitial(),
  );
  private themesSubject = new BehaviorSubject<UserPreferences[]>(
    this.getCachedThemes(),
  );
  private mobileSidebarSubject = new BehaviorSubject<boolean>(false);

  readonly preferences$ = this.prefsSubject.asObservable();

  readonly themes$ = this.themesSubject.asObservable();

  readonly mobileSidebarOpen$ = this.mobileSidebarSubject.asObservable();

  get current(): UserPreferences {
    return this.prefsSubject.value;
  }

  get themes(): UserPreferences[] {
    return this.themesSubject.value;
  }

  get mobileSidebarOpen(): boolean {
    return this.mobileSidebarSubject.value;
  }

  constructor(private http: HttpClient) {
    this.applyFontVars(this.prefsSubject.value);
  }


  loadFromApiResponse(res: any, userId: string): void {
    const rows: any[] = Array.isArray(res)
      ? res
      : (res?.data ?? res?.themes ?? res?.result ?? []);
    const rawList =
      rows.length > 0 ? rows : res?.data?.config ? [res.data.config] : [];
    if (rawList.length > 0) {
      const mapped = mapApiTheme(rawList[0]);
      this.load({ ...mapped, user_id: userId }, true);
    }
  }



  load(prefs: UserPreferences, keepCollapsed = false): void {
    if (keepCollapsed) {
      prefs = { ...prefs, sidebar_collapsed: this.prefsSubject.value.sidebar_collapsed };
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
    }
    this.prefsSubject.next(prefs);
    this.applyFontVars(prefs);
  }


  private applyFontVars(prefs: UserPreferences): void {
    const f1 = toFontStack(prefs.font_family);
    const f2 = prefs.font_family_2 ? toFontStack(prefs.font_family_2) : f1;
    const scale = String(prefs.font_scaling_factor ?? 1);
    const el = document.body;
    el.style.setProperty('--font-heading', f1);
    el.style.setProperty('--font-body', f1);
    el.style.setProperty('--font-table-header', f2);
    el.style.setProperty('--font-table-row', f1);
    el.style.setProperty('--font-button', f1);
    el.style.setProperty('--font-scale', scale);
  }


  fetchThemes(): Observable<UserPreferences[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
    });
    const themeMode = localStorage.getItem('sidebar_theme') ?? 'light';
    return this.http
      .post<any>(
`${environment.apiUrl}/theme-config/get-active-theme`,
        { theme_mode: themeMode },
        { headers },
      )
      .pipe(
        map((res) => {
          const rows: any[] = Array.isArray(res)
            ? res
            : (res?.data ?? res?.themes ?? res?.result ?? []);
          return rows.map(mapApiTheme);
        }),
        tap((themes) => {
          try {
            localStorage.setItem(THEMES_CACHE_KEY, JSON.stringify(themes));
          } catch {
            /* ignore */
          }
          this.themesSubject.next(themes);

          if (!localStorage.getItem(STORAGE_KEY) && themes.length > 0) {
            const active =
              themes.find(
                (t) => t.theme_mode === this.prefsSubject.value.theme_mode,
              ) ?? themes[0];
            this.load({
              ...active,
              user_id: this.prefsSubject.value.user_id,
              sidebar_collapsed: this.prefsSubject.value.sidebar_collapsed,
            });
          }
        }),
        catchError(() => {
          return of(this.themesSubject.value);
        }),
      );
  }
  applyPreset(mode: ThemeMode): void {
    const fetched = this.themesSubject.value.find((t) => t.theme_mode === mode);
    const base = fetched ?? { ...THEME_PRESETS[mode] };
    this.load({
      ...base,
      user_id: this.current.user_id,
      sidebar_collapsed: this.current.sidebar_collapsed,
    }, true);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.load({ ...this.current, sidebar_collapsed: collapsed });
  }

  setMobileSidebarOpen(open: boolean): void {
    this.mobileSidebarSubject.next(open);
  }

  private getInitial(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreferences;
        if (parsed?.theme_mode && parsed?.primary_color) {
          return parsed;
        }
      }
    } catch {
    }
    return LIGHT_PREFERENCES;
  }

  private getCachedThemes(): UserPreferences[] {
    try {
      const cached = localStorage.getItem(THEMES_CACHE_KEY);
      if (cached) return JSON.parse(cached) as UserPreferences[];
    } catch {
    }
    return [];
  }
   setThemeMode(mode: ThemeMode): void {
    const preset = this.themesSubject.value.find((t) => t.theme_mode === mode)
      ?? THEME_PRESETS[mode];
    const updated: UserPreferences = {
      ...this.current,
      theme_mode: mode,
      background_color: preset.background_color,
      text_color: preset.text_color,
      primary_color: preset.primary_color,
      accent_color: preset.accent_color,
    };
    this.load(updated);
  }
}
