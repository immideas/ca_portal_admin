import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CustomerService } from '../../../services/customer-group.service';

@Component({
  selector: 'app-add-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-customer.component.html',
  styleUrl: './add-customer.component.css'
})
export class AddCustomerComponent implements OnInit {

  customerForm!: FormGroup;
  projects: any[] = [];
  selectedProject: any = null;

  customerId: string | null = null;
  isEditMode = false;
  isViewMode = false;
  canEdit = false;

  fromProjectId: string | null = null;
  isProjectDropdownLocked = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private service: CustomerService,
    private toastr: ToastrService,
    private router: Router
  ) {
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canEdit = perms.includes('edit_customer');
  }

  ngOnInit(): void {
    this.createForm();

    this.customerId = this.route.snapshot.paramMap.get('id');

    this.route.queryParams.subscribe(params => {
      this.isViewMode = params['viewMode'] === 'true';

      if (params['projectId']) {
        this.fromProjectId = params['projectId'];
        this.isProjectDropdownLocked = true;
        this.customerForm.patchValue({ projectId: this.fromProjectId });
        this.customerForm.get('projectId')?.disable();
      }

      if (this.customerId) {
        this.isEditMode = !this.isViewMode;
        this.fetchDetails();
      }

      if (this.isViewMode) {
        this.customerForm.disable();
      } else if (this.isEditMode && !this.canEdit) {
        this.customerForm.disable();
        this.isViewMode = true;
        this.toastr.error('You do not have permission to edit');
      }
    });

    this.loadProjects();
  }

  createForm(): void {
    this.customerForm = this.fb.group({
      projectId: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address: ['', Validators.required]
    });
  }

  loadProjects(): void {
    this.service.listProjects({ search: '', page: 1, limit: 100 }).subscribe({
      next: (res: any) => {
        this.projects = (res.data || []).filter(
          (p: any) => p.accessType === 'closed'
        );

        if (this.fromProjectId || this.customerId) {
          this.onProjectChange();
        }
      },
      error: () => this.toastr.error('Failed to load projects')
    });
  }

  fetchDetails(): void {
    if (!this.customerId) return;

    this.service.getCustomerById(this.customerId).subscribe({
      next: (res: any) => {
        if (res.success) {
          const c = res.data;
          this.customerForm.patchValue({
            projectId: c.projectId,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address
          });
          this.onProjectChange();
        }
      },
      error: () => this.toastr.error('Failed to load customer')
    });
  }

  onProjectChange(): void {
    const rawVal = this.customerForm.getRawValue().projectId;
    this.selectedProject =
      this.projects.find(p => String(p.id) === String(rawVal)) || null;
  }

  get projectAccessType(): string {
    return this.selectedProject?.accessType || '';
  }

  get accessTypeLabel(): string {
    switch (this.projectAccessType) {
      case 'open':
        return 'Open Group';
      case 'open_location':
        return 'Open Group with Location';
      case 'closed':
        return 'Closed Group';
      default:
        return '';
    }
  }

  get accessTypeBadgeClass(): string {
    switch (this.projectAccessType) {
      case 'open':
        return 'badge-open';
      case 'open_location':
        return 'badge-open-location';
      case 'closed':
        return 'badge-closed';
      default:
        return '';
    }
  }

  save(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.toastr.error('Please fill required fields correctly');
      return;
    }

    const formVal = this.customerForm.getRawValue();

    const payload: any = {
      name: formVal.name,
      email: formVal.email,
      phone: formVal.phone,
      address: formVal.address,
      projectId: parseInt(formVal.projectId, 10)
    };

    if (this.isEditMode && this.customerId) {
      payload.id = this.customerId;
    }

    const request = this.isEditMode
      ? this.service.updateCustomer(payload)
      : this.service.createCustomerForGroup(payload);

    request.subscribe({
      next: (res: any) => {
        this.toastr.success(
          res.message ||
          `Customer ${this.isEditMode ? 'updated' : 'created'} successfully`
        );

        if (this.fromProjectId) {
          this.router.navigate(['/manage-customer'], {
            queryParams: { projectId: this.fromProjectId }
          });
        } else {
          this.router.navigate(['/manage-customer']);
        }
      },
      error: (err: any) => {
        this.toastr.error(
          err.error?.message ||
          `${this.isEditMode ? 'Update' : 'Create'} failed`
        );
      }
    });
  }

  enableEditMode(): void {
    if (this.canEdit) {
      this.isViewMode = false;
      this.isEditMode = true;
      this.customerForm.enable();
      if (this.isProjectDropdownLocked) {
        this.customerForm.get('projectId')?.disable();
      }
    } else {
      this.toastr.error('Access Denied');
    }
  }

  cancel(): void {
    if (this.fromProjectId) {
      this.router.navigate(['/manage-customer'], {
        queryParams: { projectId: this.fromProjectId }
      });
    } else {
      this.router.navigate(['/manage-customer']);
    }
  }
}
