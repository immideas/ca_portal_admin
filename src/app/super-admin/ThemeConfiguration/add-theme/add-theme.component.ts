import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorMethodSelectorComponent } from '@swiftlyme/color-spotter';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  NgxUiLoaderModule,
  NgxUiLoaderService
} from 'ngx-ui-loader';

import { ToastrService } from 'ngx-toastr';

import {
  ThemeConfigurationService,
  ThemeConfig
} from '../../../services/theme-configuration.service';

@Component({
  selector: 'app-add-theme',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgxUiLoaderModule,
    ColorMethodSelectorComponent
  ],
  templateUrl: './add-theme.component.html',
  styleUrls: ['./add-theme.component.scss']
})
export class AddThemeComponent implements OnInit {

  themeForm!: FormGroup;

  isEditMode = false;
  isViewMode = false;

  themeId: number | null = null;

  errorMessage = '';

  isSuperAdmin =
    (localStorage.getItem('roleCode') || '') === 'super_admin';

  canManage = false;
  canEdit = false;
  canAdd = false;
  canView = false;

  hexColorPattern =
    '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$';

  // Tracks which "Color Configurations" groups are expanded.
  // First group open by default, rest collapsed to keep the form short.
  openColorGroups: Set<number> = new Set([0]);

// Grouped color fields — each group renders as its own labeled
// sub-section inside "Color Configurations" instead of one long
// flat grid of 27 fields.
colorGroups = [
  {
    title: 'Primary Colors',
    icon: 'bi-palette',
    fields: [
      { key: 'primary_color', label: 'Primary Color' },
      { key: 'primary_hover_color', label: 'Primary Hover Color' }
    ]
  },
  {
    title: 'Sidebar Colors',
    icon: 'bi-layout-sidebar',
    fields: [
      { key: 'sidebar_color', label: 'Sidebar Color' },
      { key: 'sidebar_active_color', label: 'Sidebar Active Color' },
      { key: 'sidebar_active_text_color', label: 'Sidebar Active Text Color' },
      { key: 'sidebar_text_color', label: 'Sidebar Text Color' },
      { key: 'sidebar_hover_color', label: 'Sidebar Hover Color' },
      { key: 'sidebar_icon_color', label: 'Sidebar Icon Color' },
      { key: 'sidebar_hover_bg_color', label: 'Sidebar Hover Background Color' },
      { key: 'sidebar_border_color', label: 'Sidebar Border Color' }
    ]
  },
  {
    title: 'Navbar Colors',
    icon: 'bi-menu-button-wide',
    fields: [
      { key: 'navbar_color', label: 'Navbar Color' },
      { key: 'navbar_text_color', label: 'Navbar Text Color' },
      { key: 'navbar_icon_color', label: 'Navbar Icon Color' },
      { key: 'navbar_hover_color', label: 'Navbar Hover Color' }
    ]
  },
  {
    title: 'Page & Card Colors',
    icon: 'bi-window',
    fields: [
      { key: 'page_background_color', label: 'Page Background Color' },
      { key: 'card_background_color', label: 'Card Background Color' },
      { key: 'card_border_color', label: 'Card Border Color' },
      { key: 'section_header_color', label: 'Section Header Color' }
    ]
  },
  {
    title: 'Input Colors',
    icon: 'bi-input-cursor-text',
    fields: [
      { key: 'input_background_color', label: 'Input Background Color' },
      { key: 'input_border_color', label: 'Input Border Color' },
      { key: 'input_focus_background_color', label: 'Input Focus Background Color' },
      { key: 'input_disabled_background_color', label: 'Input Disabled Background Color' }
    ]
  },
  {
    title: 'Text Colors',
    icon: 'bi-fonts',
    fields: [
      { key: 'text_color', label: 'Text Color' },
      { key: 'label_color', label: 'Label Color' },
      { key: 'muted_text_color', label: 'Muted Text Color' }
    ]
  },
  {
    title: 'Common / Status Colors',
    icon: 'bi-border-all',
    fields: [
      { key: 'border_color', label: 'Border Color' },
      { key: 'error_color', label: 'Error Color' }
    ]
  }
];
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private themeService: ThemeConfigurationService,
    private loader: NgxUiLoaderService,
    private toastr: ToastrService
  ) {

    const perms =
      (localStorage.getItem('permissions') || '')
        .split(',')
        .map(permission => permission.trim());


    this.canManage =
      this.isSuperAdmin ||
      perms.includes('manage_themes');

    this.canAdd =
      this.isSuperAdmin ||
      perms.includes('add_theme');

    this.canEdit =
      this.isSuperAdmin ||
      perms.includes('edit_theme');

    this.canView =
      this.isSuperAdmin ||
      perms.includes('view_theme');
  }

  ngOnInit(): void {

    this.initForm();

    this.determineMode();
  }


  initForm(): void {

  this.themeForm = this.fb.group({

    theme_name: [
      '',
      [
        Validators.required,
        Validators.minLength(3)
      ]
    ],

    description: [''],

    status: [
      1,
      Validators.required
    ],

    // =====================================================
    // PRIMARY COLORS
    // =====================================================

    primary_color: [
      '#4F46E5',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    primary_hover_color: [
      '#4338CA',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    // =====================================================
    // SIDEBAR COLORS
    // =====================================================

    sidebar_color: [
      '#ECF4FF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    sidebar_active_color: [
      '#4C91EE',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    sidebar_active_text_color: [
      '#FFFFFF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    sidebar_text_color: [
      '#111827',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    sidebar_hover_color: [
      '#4154F1',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    sidebar_icon_color: [
      '#4154F1',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    sidebar_hover_bg_color: [
      '#F3F6FF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    sidebar_border_color: [
      '#E5E7EB',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    // =====================================================
    // NAVBAR COLORS
    // =====================================================

    navbar_color: [
      '#FFFFFF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    navbar_text_color: [
      '#111827',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    navbar_icon_color: [
      '#012970',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    navbar_hover_color: [
      '#4154F1',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    // =====================================================
    // PAGE / CARD COLORS
    // =====================================================

    page_background_color: [
      '#F8FAFF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    card_background_color: [
      '#FFFFFF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    card_border_color: [
      '#D6E4FF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    section_header_color: [
      '#F1F5FF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    // =====================================================
    // INPUT COLORS
    // =====================================================

    input_background_color: [
      '#F9FAFB',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    input_border_color: [
      '#EEF2F7',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    input_focus_background_color: [
      '#EEF4FF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    input_disabled_background_color: [
      '#F3F4F6',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    // =====================================================
    // TEXT COLORS
    // =====================================================

    text_color: [
      '#1F2937',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    label_color: [
      '#6B7280',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    muted_text_color: [
      '#9CA3AF',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    // =====================================================
    // COMMON / STATUS COLORS
    // =====================================================

    border_color: [
      '#E5E7EB',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ],

    error_color: [
      '#DC2626',
      [
        Validators.required,
        Validators.pattern(this.hexColorPattern)
      ]
    ]

  });
}

  determineMode(): void {

    this.themeId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    const mode =
      this.route.snapshot.queryParamMap.get('mode');

    if (
      this.themeId &&
      mode === 'view'
    ) {

      if (!this.canManage && !this.canView) {

        this.toastr.error(
          'You do not have permission to view themes.'
        );

        this.cancel();
        return;
      }

      this.isViewMode = true;
      this.isEditMode = false;

      this.openColorGroups = new Set(
        this.colorGroups.map((_, i) => i)
      );

      this.themeForm.disable();

      this.loadThemeData(
        this.themeId
      );

      return;
    }


    if (this.themeId) {

      if (!this.canEdit) {

        this.toastr.error(
          'You do not have permission to edit themes.'
        );

        this.cancel();
        return;
      }

      this.isEditMode = true;
      this.isViewMode = false;

      this.loadThemeData(
        this.themeId
      );

      return;
    }


    if (!this.canAdd) {

      this.toastr.error(
        'You do not have permission to add themes.'
      );

      this.cancel();
      return;
    }


    if (!this.isSuperAdmin) {
      this.checkExistingThemeLimit();
    }
  }


  checkExistingThemeLimit(): void {

    this.themeService
      .getMyTheme()
      .subscribe({

        next: (res: any) => {

          if (res?.data?.id) {

            this.toastr.warning(
              'You have already created a theme. Redirecting to edit your existing theme.'
            );

            this.router.navigate([
              '/add-theme',
              res.data.id
            ]);
          }
        },

        error: (err: any) => {

          console.error(
            'Limit check error:',
            err
          );
        }
      });
  }

  loadThemeData(id: number): void {

    this.loader.start();

    this.themeService
      .getThemeById(id)
      .subscribe({

        next: (res: any) => {

          if (res?.data) {

            this.themeForm.patchValue(
              res.data
            );
          }


          if (this.isViewMode) {
            this.themeForm.disable();
          }

          this.loader.stop();
        },

        error: (err: any) => {

          this.loader.stop();

          this.toastr.error(
            err?.error?.message ||
            'Failed to load theme details.'
          );

          this.cancel();
        }
      });
  }

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

onColorPick(fieldKey: string, hex: string): void {

  this.themeForm
    .get(fieldKey)
    ?.setValue(hex);

  this.themeForm
    .get(fieldKey)
    ?.markAsTouched();
}

  enableEditMode(): void {

    if (!this.canEdit) {

      this.toastr.error(
        'You do not have permission to edit themes.'
      );

      return;
    }

    if (!this.themeId) {
      return;
    }

    this.isViewMode = false;
    this.isEditMode = true;

    this.themeForm.enable();

    this.router.navigate([
      '/add-theme',
      this.themeId
    ]);
  }


  saveTheme(): void {


    if (this.isViewMode) {
      return;
    }

    if (this.themeForm.invalid) {

      this.themeForm.markAllAsTouched();

      return;
    }

    this.loader.start();


    const formData: Partial<ThemeConfig> =
      this.themeForm.getRawValue();

    const request =
      this.isEditMode && this.themeId

        ? this.themeService.updateTheme(
            this.themeId,
            formData
          )

        : this.themeService.createTheme(
            formData
          );

    request.subscribe({

      next: (res: any) => {

        this.loader.stop();

        this.toastr.success(
          res?.message ||
          (
            this.isEditMode
              ? 'Theme updated successfully.'
              : 'Theme created successfully.'
          )
        );

        this.cancel();
      },

      error: (err: any) => {

        this.loader.stop();

        this.errorMessage =
          err?.error?.message ||
          (
            this.isEditMode
              ? 'Failed to update theme.'
              : 'Failed to create theme.'
          );

        this.toastr.error(
          this.errorMessage
        );
      }
    });
  }


  cancel(): void {

    this.router.navigate([
      '/manage-themes'
    ]);
  }
}
