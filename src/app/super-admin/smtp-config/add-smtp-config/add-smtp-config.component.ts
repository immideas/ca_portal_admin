import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SmtpConfigService } from '../../../services/smtp-config.service';

@Component({
  selector: 'app-add-smtp-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, HttpClientModule],
  templateUrl: './add-smtp-config.component.html',
  styleUrls: ['./add-smtp-config.component.css']
})
export class AddSmtpConfigComponent implements OnInit {
  smtpForm!: FormGroup;
  configId: string | null = null;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  isUploading: boolean = false;
  canEdit: boolean = true;
  errorMessage: string = '';
  isSuperAdmin: boolean = false;

  constructor(
    private fb: FormBuilder,
    private smtpConfigService: SmtpConfigService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.initForm();

    this.configId = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode');

    if (this.configId) {
      if (mode === 'view') {
        this.isViewMode = true;
        this.isEditMode = false;
      } else if (mode === 'edit') {
        this.isEditMode = true;
        this.isViewMode = false;
      }
      this.fetchSmtpDetails(this.configId);
    } else if (this.isSuperAdmin) {
      
      this.fetchGlobalSmtpConfig();
    }
  }

  checkUserRole(): void {
    const role = localStorage.getItem('role');
    this.isSuperAdmin = role === 'SUPER_ADMIN';
  }

  initForm(): void {
    this.smtpForm = this.fb.group({
      id: [null],
      projectId: [null],
      host: ['', [Validators.required]],
      port: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      secure: [false],
      authUser: ['', [Validators.required, Validators.email]],
      authPass: ['', [Validators.required]],
      status: [1]
    });
  }

  fetchSmtpDetails(id: string): void {
    this.smtpConfigService.getById(id).subscribe({
      next: (res) => {
        if (res.data) {
          this.smtpForm.patchValue(res.data);

          if (this.isViewMode) {
            this.smtpForm.disable(); 
          }
        }
      },
      error: (err: any) => console.error(err)
    });
  }

  fetchGlobalSmtpConfig(): void {
    this.smtpConfigService.getGlobalSmtpConfig().subscribe({
      next: (res) => {
        if (res.data) {
          this.configId = (res.data as any).id ?? null;
          this.smtpForm.patchValue(res.data);
          this.isEditMode = true;
          this.isViewMode = false;
        }
      },
      error: (err: any) => {
        if (err.status !== 404) {
          console.error(err);
        }
      }
    });
  }

  enableEditMode(): void {
    this.isViewMode = false;
    this.isEditMode = true;
    this.smtpForm.enable();
  }

  cancel(): void {
    this.router.navigate(['/manage-smtp-config']);
  }

  saveSmtpConfig(): void {
    if (this.smtpForm.invalid) {
      this.smtpForm.markAllAsTouched();
      return;
    }

    const payload = { ...this.smtpForm.value };
    if (this.isSuperAdmin) {
      payload.projectId = null;
    }

    if (payload.status == 1) {
      this.toastr.info(
        'Only one SMTP configuration can be active at a time. Any previously active configuration will be deactivated automatically.',
        'Activating SMTP Config'
      );
    }

    this.isUploading = true;

    this.smtpConfigService.save(payload).subscribe({
      next: () => {
        this.isUploading = false;
        this.toastr.success(
          this.configId
            ? 'SMTP configuration updated successfully'
            : 'SMTP configuration created successfully'
        );
        this.router.navigate(['/manage-smtp-config']);
      },
      error: (err: any) => {
        this.isUploading = false;
        this.errorMessage = err.error?.error || err.error?.message || 'Failed to save SMTP config';
        this.toastr.error(this.errorMessage);
      }
    });
  }
}