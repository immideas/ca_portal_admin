import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { ToastrService } from 'ngx-toastr';
import { EmailTemplateService } from '../../../services/email-template.service';
import { EventsService } from '../../../services/events.service';
import { EditorComponent } from '@swiftlyme/editor';
@Component({
  selector: 'app-add-email-template',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxUiLoaderModule, EditorComponent],
  templateUrl: './add-email-template.component.html',
  styleUrls: ['./add-email-template.component.css']
})
export class AddEmailTemplateComponent implements OnInit {
  templateForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  id: string | null = null;
  events: any[] = [];
canEdit = false;
  // FIX: Admin still gets the Edit option, but can only change Subject &
  // Body — Title/Event stay locked. Super Admin can edit every field.
  isSuperAdmin = (localStorage.getItem('roleCode') || '') === 'super_admin';

  constructor(
    private fb: FormBuilder,
    private service: EmailTemplateService,
    private eventsService: EventsService,
    private router: Router,
    private route: ActivatedRoute,
    private loader: NgxUiLoaderService,
    private toastr: ToastrService
  ) {
     // 👇 NAYA
    const perms = (localStorage.getItem('permissions') || '').split(',');
    this.canEdit = this.isSuperAdmin || perms.includes('edit_email_template');

    // FIX: form fields now match the backend model (title, subject, body, event_id)
    // instead of the old event_name / event_description / body_html which didn't
    // exist on the EmailTemplate model at all.

    this.templateForm = this.fb.group({
      title: ['', Validators.required],
      subject: ['', Validators.required],
      body: ['', Validators.required],
      event_id: ['']
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

  // FIX: on an existing template, non-super-admins may only change Subject
  // and Body — Title/Event stay locked. Super Admin keeps full edit access.
  // Applied right after loading the record, and again whenever edit mode is
  // (re)entered via enableEdit(), since that call does a blanket
  // templateForm.enable().
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
    this.service.getTemplateID(this.id).subscribe({
      next: (res: any) => {
        // FIX: backend wraps the record inside data.details, matching the
        // controller's response shape (data: { details: template })
        const template = res?.data?.details ?? res?.data;
        this.templateForm.patchValue({
          title: template?.title,
          subject: template?.subject,
          body: template?.body,
          event_id: template?.event_id,
        });
        // FIX: existing template loaded — restrict edits to subject & body only
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
    // 👇 NAYA — permission check add kiya
    if (!this.canEdit) {
      this.toastr.error('Access Denied: You cannot edit email templates.');
      return;
    }
    this.isViewMode = false;
    this.isEditMode = true;
    this.templateForm.enable();
    this.lockNonEditableFields();
  }
  cancel() {
    this.router.navigate(['/manage-email-templates']);
  }

  save() {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }
    this.loader.start();

    const formValues = this.templateForm.getRawValue();

    // FIX: backend update route (PUT /email-template/update) expects "id",
    // not "template_id" — that was carried over incorrectly from the
    // SMS/WhatsApp controllers, which use a different body-based convention.
    const requestData = this.isEditMode
      ? { ...formValues, id: this.id }
      : formValues;

    const req = this.isEditMode
      ? this.service.updateTemplate(requestData)
      : this.service.createTemplate(requestData);

    req.subscribe({
      next: () => {
        this.loader.stop();
        this.toastr.success(`Template ${this.isEditMode ? 'updated' : 'created'} successfully`);
        this.router.navigate(['/manage-email-templates']);
      },
      error: (err) => {
        this.loader.stop();
        this.toastr.error(err.error?.message || 'Server error');
      }
    });
  }
}