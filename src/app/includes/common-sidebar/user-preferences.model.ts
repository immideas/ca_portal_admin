
export type ThemeMode = 'light' | 'dark' | 'high-contrast';
export type BorderRadius = 'none' | 'small' | 'medium' | 'large';
export type Density = 'compact' | 'comfortable' | 'spacious';

export interface UserPreferences {
  id: number;
  user_id: string;
  theme_mode: ThemeMode;
  font_family: string; 
  font_family_2?: string; 

  primary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;

  reduce_motion: boolean;
  increase_contrast: boolean;
  font_scaling_factor: number;

  border_radius: BorderRadius;
  density: Density;
  sidebar_collapsed: boolean;

  button_border_radius: BorderRadius;
  button_size: 'sm' | 'md' | 'lg';
  button_variant: 'filled' | 'outlined' | 'ghost';
  button_primary_bg: string;
  button_primary_text_color: string;
  button_hover_bg: string;
  button_border_color: string;
  button_border_width: number;
  button_font_weight: 'normal' | 'medium' | 'semibold' | 'bold';
  button_font_size: 'sm' | 'md' | 'lg';
  button_shadow: 'none' | 'sm' | 'md' | 'lg';
  button_uppercase: boolean;
  button_full_width: boolean;
  button_icon_position: 'left' | 'right';
  button_high_contrast_border: boolean;
  button_focus_ring_color: string;
  button_focus_ring_width: number;
  button_disabled_opacity: number;

  use_system_theme: boolean;
  is_default: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const LIGHT_PREFERENCES: UserPreferences = {
  id: 1,
  user_id: '',
  theme_mode: 'light',
  font_family: 'SF Pro Display',

  primary_color: '#4154f1',
  background_color: '#ECF4FF',
  text_color: '#333333',
  accent_color: '#4154f1',

  reduce_motion: false,
  increase_contrast: false,
  font_scaling_factor: 1.0,

  border_radius: 'medium',
  density: 'comfortable',
  sidebar_collapsed: false,

  button_border_radius: 'medium',
  button_size: 'md',
  button_variant: 'filled',
  button_primary_bg: '#4154f1',
  button_primary_text_color: '#ffffff',
  button_hover_bg: '#3346d4',
  button_border_color: '#4154f1',
  button_border_width: 1,
  button_font_weight: 'semibold',
  button_font_size: 'md',
  button_shadow: 'sm',
  button_uppercase: false,
  button_full_width: false,
  button_icon_position: 'left',
  button_high_contrast_border: false,
  button_focus_ring_color: '#6370f5',
  button_focus_ring_width: 2,
  button_disabled_opacity: 0.5,

  use_system_theme: false,
  is_default: true,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

export const DARK_PREFERENCES: UserPreferences = {
  id: 2,
  user_id: '',
  theme_mode: 'dark',
  font_family: 'SF Pro Display',

  primary_color: '#3B82F6',
  background_color: '#0B1F4D',
  text_color: '#E2E8F0',
  accent_color: '#F59E0B',

  reduce_motion: false,
  increase_contrast: false,
  font_scaling_factor: 1.0,

  border_radius: 'medium',
  density: 'comfortable',
  sidebar_collapsed: false,

  button_border_radius: 'medium',
  button_size: 'md',
  button_variant: 'filled',
  button_primary_bg: '#3B82F6',
  button_primary_text_color: '#ffffff',
  button_hover_bg: '#2563EB',
  button_border_color: '#3B82F6',
  button_border_width: 1,
  button_font_weight: 'semibold',
  button_font_size: 'md',
  button_shadow: 'sm',
  button_uppercase: false,
  button_full_width: false,
  button_icon_position: 'left',
  button_high_contrast_border: false,
  button_focus_ring_color: '#60A5FA',
  button_focus_ring_width: 2,
  button_disabled_opacity: 0.5,

  use_system_theme: false,
  is_default: false,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

export const HIGH_CONTRAST_PREFERENCES: UserPreferences = {
  id: 3,
  user_id: '',
  theme_mode: 'high-contrast',
  font_family: 'SF Pro Display',

  primary_color: '#ffff00',
  background_color: '#000000',
  text_color: '#ffffff',
  accent_color: '#ffff00',

  reduce_motion: false,
  increase_contrast: true,
  font_scaling_factor: 1.0,

  border_radius: 'small',
  density: 'comfortable',
  sidebar_collapsed: false,

  button_border_radius: 'small',
  button_size: 'md',
  button_variant: 'outlined',
  button_primary_bg: '#ffff00',
  button_primary_text_color: '#000000',
  button_hover_bg: '#ffffaa',
  button_border_color: '#ffffff',
  button_border_width: 2,
  button_font_weight: 'bold',
  button_font_size: 'md',
  button_shadow: 'none',
  button_uppercase: false,
  button_full_width: false,
  button_icon_position: 'left',
  button_high_contrast_border: true,
  button_focus_ring_color: '#ffff00',
  button_focus_ring_width: 3,
  button_disabled_opacity: 0.6,

  use_system_theme: false,
  is_default: false,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

export const THEME_PRESETS: Record<ThemeMode, UserPreferences> = {
  light: LIGHT_PREFERENCES,
  dark: DARK_PREFERENCES,
  'high-contrast': HIGH_CONTRAST_PREFERENCES,
};
