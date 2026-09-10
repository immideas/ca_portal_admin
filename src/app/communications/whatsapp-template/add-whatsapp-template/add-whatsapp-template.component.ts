import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService } from 'ngx-toastr';
import { WhatsappTemplatesService } from '../../../services/whatsapp-templates.service';
import { EventsService } from '../../../services/events.service';

@Component({
  selector: 'app-add-whatsapp-template',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxUiLoaderModule],
  templateUrl: './add-whatsapp-template.component.html',
  styleUrl: './add-whatsapp-template.component.css'
})
export class AddWhatsappTemplateComponent implements OnInit {
  templateForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
 
  id: string | null = null;
  events: any[] = [];

  
  isSuperAdmin = (localStorage.getItem('roleCode') || '') === 'super_admin';
 canEdit = false;
 
  typeOptions = ['transactional', 'promotional', 'otp'];

  constructor(
    private fb: FormBuilder,
    private service: WhatsappTemplatesService,
    private eventsService: EventsService,
    private router: Router,
    private route: ActivatedRoute,
    private loader: NgxUiLoaderService,
    private toastr: ToastrService
  ) {
  const perms = (localStorage.getItem('permissions') || '').split(',');
  this.canEdit = this.isSuperAdmin || perms.includes('edit_whatsapp_template');

    this.templateForm = this.fb.group({
      title: ['', Validators.required],
      body: ['', Validators.required],
      event_id: [''],
      dltTemplateId: [''],
      type: [''],
      status: [1]
    });
  }

  ngOnInit(): void {
    this.loadEvents();

    this.id = this.route.snapshot.paramMap.get('id');

    if (this.id) {
      this.isEditMode = true;
      this.load();
    }

    this.route.queryParamMap.subscribe(q => {
      this.isViewMode = q.get('viewMode') === 'true';
      if (this.isViewMode) {
        this.templateForm.disable();
      }
    });
  }

  get f() {
    return this.templateForm.controls;
  }

 
  private lockNonEditableFields() {
    if (this.isEditMode && !this.isSuperAdmin) {
      this.templateForm.get('title')?.disable();
      this.templateForm.get('event_id')?.disable();
    }
  }

  loadEvents() {
    this.eventsService.getAllEvents({ page: 1, limit: 1000, search_key: '', order: { column: 'id', dir: 'ASC' } }).subscribe({
      next: (res: any) => { this.events = res?.data?.details ?? res?.data ?? []; },
      error: () => { this.events = []; }
    });
  }

  load() {
    this.loader.start();
    this.service.getWhatsappTemplateById(this.id).subscribe({
      next: (res: any) => {
        const template = res?.data?.details ?? res?.data;
        this.templateForm.patchValue({
          title: template?.title,
          body: template?.body,
          event_id: template?.event_id,
          dltTemplateId: template?.dltTemplateId,
          type: template?.type,
          status: template?.status,
        });
        this.lockNonEditableFields();
        this.loader.stop();
      },
      error: () => {
        this.loader.stop();
        this.toastr.error('Failed to load data');
      }
    });
  }

 enableEdit() {
  if (!this.canEdit) {
    this.toastr.error('Access Denied: You cannot edit WhatsApp templates.');
    return;
  }
  this.isViewMode = false;
  this.isEditMode = true;
  this.templateForm.enable();
  this.lockNonEditableFields();
}

  cancel() {
    this.router.navigate(['/manage-whatsapp-templates']);
  }

  save() {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }
    this.loader.start();

    const formValues = this.templateForm.getRawValue();

    const requestData = this.isEditMode
      ? { ...formValues, template_id: this.id }
      : formValues;

    const req = this.isEditMode
      ? this.service.updateWhatsappTemplate(requestData)
      : this.service.createWhatsappTemplate(requestData);

    req.subscribe({
      next: () => {
        this.loader.stop();
        this.toastr.success(`Template ${this.isEditMode ? 'updated' : 'created'} successfully`);
        this.router.navigate(['/manage-whatsapp-templates']);
      },
      error: (err) => {
        this.loader.stop();
        this.toastr.error(err.error?.message || 'Server error');
      }
    });
  }
}