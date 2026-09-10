import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { EventsService } from '../../../services/events.service';

@Component({
  selector: 'app-add-event-trigger',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-event-trigger.component.html',
  styleUrls: ['./add-event-trigger.component.css'],
})
export class AddEventTriggerComponent implements OnInit, OnDestroy {

  eventForm!: FormGroup;
  eventId: string | null = null;
  eventDetails: any;

  isEditMode = false;
  isViewMode = false;
  canEdit = false;

  showLoader = false;
  showBtnLoader = false;
  errorValue = '';

  pageTitle = 'Add Event';
  pageSubtitle = 'Create a new event';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private toastr: ToastrService,
  ) {
    // localStorage is only available in the browser; guard so this doesn't
    // throw during SSR/prerendering.
    const roleCode = typeof localStorage !== 'undefined' ? localStorage.getItem('roleCode') : null;
    const isSuperAdmin = roleCode === 'super_admin';
    // const perms = (typeof localStorage !== 'undefined' ? localStorage.getItem('permissions') : null || '').split(',');
    const rawPerms = typeof localStorage !== 'undefined' ? localStorage.getItem('permissions') : null;
const perms = (rawPerms ?? '').split(',');
    this.canEdit = isSuperAdmin || perms.includes('edit_event');
  }

  ngOnInit(): void {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      status: [1, [Validators.required]],
    });
// FIX: agar user ke paas edit_event permission nahi hai, form hamesha
  // disabled rahega — chahe viewMode query param ho ya na ho, chahe
  // koi bhi route se yahan aaya ho.
  if (!this.canEdit) {
    this.eventForm.disable();
  }
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.eventId = params.get('id');
      if (this.eventId) {
        this.isEditMode = true;
        this.pageTitle = 'Update Event';
        this.pageSubtitle = 'Edit event details';
        this.fetchEvent();
      }
    });

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((q) => {
      this.isViewMode = q.get('viewMode') === 'true';
      // if (this.isViewMode) {
          if (this.isViewMode || !this.canEdit) {   // <-- canEdit false hone pe bhi lock

        this.pageTitle = 'View Event';
        this.pageSubtitle = 'Event details';
        this.eventForm.disable();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchEvent(): void {
    if (!this.eventId) return;
    // No get-by-id API provided; load list and find by id
    this.showLoader = true;
    this.eventsService
      .getAllEvents({ page: 1, limit: 1000, search_key: '', order: { column: 'id', dir: 'ASC' } })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const list: any[] = res?.data?.details ?? res?.data ?? [];
          this.eventDetails = list.find(
            (e: any) => String(e.id) === String(this.eventId) || String(e._id) === String(this.eventId),
          );
          if (!this.eventDetails) {
            this.errorValue = 'Event not found';
          }
          this.patchFormValues();
        },
        error: (err: any) => {
          this.errorValue = err?.error?.message || 'Failed to load event';
          this.showLoader = false;
        },
      });
  }

  patchFormValues(): void {
    this.showLoader = false;
    if (!this.eventDetails) return;
    this.eventForm.patchValue({
      name: this.eventDetails.name,
      description: this.eventDetails.description,
      status: Number(this.eventDetails.status),
    });
    // FIX: patchValue ke baad bhi permission re-enforce karo
  if (!this.canEdit) {
    this.eventForm.disable();
  }
  }

  get f() { return this.eventForm.controls; }

  enableEditMode(): void {
    if (!this.canEdit) {
      this.toastr.error('Access Denied: You cannot edit events.');
      return;
    }
    this.isViewMode = false;
    this.pageTitle = 'Update Event';
    this.pageSubtitle = 'Edit event details';
    this.eventForm.enable();
  }

  onSubmit(): void {
    if (this.eventId) this.onUpdate();
    else this.onCreate();
  }

  onCreate(): void {
     if (!this.canEdit) {
    this.toastr.error('Access Denied: You cannot create events.');
    return;
  }
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields!');
      return;
    }
    this.errorValue = '';
    this.showBtnLoader = true;
    const data = {
      name: this.f['name'].value,
      description: this.f['description'].value,
      status: Number(this.f['status'].value),
    };
    this.eventsService
      .createEvent(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showBtnLoader = false;
          this.toastr.success('Event Created Successfully!');
          this.router.navigate(['/manage-event-trigger']);
        },
        error: (err: any) => {
          this.errorValue = err?.error?.message || 'Failed to create event';
          this.showBtnLoader = false;
        },
      });
  }

  onUpdate(): void {
     if (!this.canEdit) {
    this.toastr.error('Access Denied: You cannot edit events.');
    return;
  }
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields!');
      return;
    }
    this.errorValue = '';
    this.showBtnLoader = true;
    const data = {
      event_id: Number(this.eventId),
      name: this.f['name'].value,
      description: this.f['description'].value,
      status: Number(this.f['status'].value),
    };
    this.eventsService
      .updateEvent(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showBtnLoader = false;
          this.toastr.success('Event Updated Successfully!');
          this.router.navigate(['/manage-event-trigger']);
        },
        error: (err: any) => {
          this.errorValue = err?.error?.message || 'Failed to update event';
          this.showBtnLoader = false;
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/manage-event-trigger']);
  }
}