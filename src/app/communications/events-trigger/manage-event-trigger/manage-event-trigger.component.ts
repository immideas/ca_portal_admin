import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { EventsService } from '../../../services/events.service';

@Component({
  selector: 'app-manage-event-trigger',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCheckboxModule, RouterModule],
  templateUrl: './manage-event-trigger.component.html',
  styleUrl: './manage-event-trigger.component.css'
})
export class ManageEventTriggerComponent implements OnInit {
  Math = Math;

  events: any[] = [];
  loading = false;
  saving = false;

  readonly skeletonRows = Array(10).fill(0);

  searchTerm = '';
  private searchTimeout: any;

  pageSize = 10;
  currentPage = 1;

  sortCol = 'name';
  sortDir: 'asc' | 'desc' = 'asc';


  private pendingChanges: { [eventId: number]: any } = {};
  private debounceTimers: { [eventId: number]: any } = {};
  private inFlight: { [eventId: number]: boolean } = {};

  canManage = false;
  canAdd = false;
  canView = false;
  canEdit = false;
  canEditTrigger = false;

  constructor(
    private eventsService: EventsService,
    private router: Router,
    private toastr: ToastrService,
  ) {
    const roleCode = localStorage.getItem('roleCode');
    const isSuperAdmin = roleCode === 'super_admin';
    const perms = (localStorage.getItem('permissions') || '').split(',');

    this.canManage = isSuperAdmin || perms.includes('manage_events');
    this.canAdd = isSuperAdmin || perms.includes('add_event');
    this.canView = isSuperAdmin || perms.includes('view_event');
    this.canEdit = isSuperAdmin || perms.includes('edit_event');
      this.canEditTrigger = isSuperAdmin || perms.includes('event_trigger'); 

  }

  ngOnInit(): void {
    if (this.canManage || this.canView) {
      this.loadEvents();
    } else {
      this.toastr.error('You do not have permission to view events.');
    }
  }

  loadEvents() {
    this.loading = true;
    forkJoin([
      this.eventsService.getAllEvents({
        page: 1,
        limit: 1000,
        search_key: '',
        order: { column: 'id', dir: 'ASC' },
      }),
      this.eventsService.listCommunicationTriggers(),
    ]).subscribe({
      next: ([eventsRes, triggersRes]: [any, any]) => {
        const events: any[] = eventsRes?.data?.details ?? eventsRes?.data ?? [];
        const triggers: any[] = triggersRes?.data?.details ?? triggersRes?.data ?? [];
        const triggerMap = new Map<number, any>(triggers.map((t: any) => [t.event_id, t]));

        this.events = events.map((e: any) => {
          const t = triggerMap.get(e.id);
          return {
            ...e,
            triggerId: t?.trigger_id ?? t?.id ?? 0,
            whatsapp: t?.whatsapp ?? false,
            email: t?.email ?? false,
            sms: t?.sms ?? false,
            triggerStatus: t?.status ?? 1,
          };
        });
        this.loading = false;
        this.currentPage = 1;
      },
      error: () => {
        this.events = [];
        this.loading = false;
        this.toastr.error('Failed to load events');
      },
    });
  }

 
  isTriggerEditable(ev: any): boolean {
return this.canEditTrigger && ev.status === 1;   }

 
  onTriggerChange(event: any): void {
    if (!this.isTriggerEditable(event)) return;

    const eventId = event.id;

    
    this.pendingChanges[eventId] = {
      id: event.id,
      triggerId: event.triggerId,
      triggerStatus: event.triggerStatus,
      sms: event.sms,
      email: event.email,
      whatsapp: event.whatsapp,
    };

    if (this.debounceTimers[eventId]) {
      clearTimeout(this.debounceTimers[eventId]);
    }

 
    this.debounceTimers[eventId] = setTimeout(() => {
      delete this.debounceTimers[eventId];
      this.flushTrigger(eventId);
    }, 700);
  }

 
  private flushTrigger(eventId: number): void {
    
    if (this.inFlight[eventId]) return;

    const payload = this.pendingChanges[eventId];
    if (!payload) return;

    
    delete this.pendingChanges[eventId];
    this.inFlight[eventId] = true;
    this.saving = true;

    const request =
      payload.triggerId === 0
        ? this.eventsService.createCommunicationTrigger({
            event_id: payload.id,
            sms: payload.sms,
            email: payload.email,
            whatsapp: payload.whatsapp,
          })
        : this.eventsService.updateCommunicationTrigger({
            trigger_id: payload.triggerId,
            event_id: payload.id,
            sms: payload.sms,
            email: payload.email,
            whatsapp: payload.whatsapp,
            status: payload.triggerStatus,
          });

    request.subscribe({
      next: (res: any) => {
        this.saving = false;
        this.inFlight[eventId] = false;

        
        if (payload.triggerId === 0) {
          const newId = res?.data?.trigger_id ?? res?.data?.id;
          const ev = this.events.find((e) => e.id === eventId);
          if (ev && newId) ev.triggerId = newId;
        }

        this.toastr.success('Updated Successfully');

        
        if (this.pendingChanges[eventId]) {
          this.flushTrigger(eventId);
        }
      },
      error: () => {
        this.saving = false;
        this.inFlight[eventId] = false;
        this.toastr.error('Failed to update');

        if (this.pendingChanges[eventId]) {
          this.flushTrigger(eventId);
        }
      },
    });
  }

  onSearchChange(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
    }, 400);
  }

  onPageChange(newPage: number): void {
    const maxPage = Math.ceil(this.filteredEvents.length / this.pageSize);
    if (newPage < 1 || newPage > maxPage || newPage === this.currentPage) return;
    this.currentPage = newPage;
  }

  setSort(col: string): void {
    if (this.sortCol === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = col;
      this.sortDir = 'asc';
    }
  }

  get filteredEvents() {
    let list = this.events;
    const term = this.searchTerm?.toLowerCase().trim();
    if (term) {
      list = list.filter((e) => {
      const text = `${e.name ?? ''} ${e.description ?? ''} ${e.short_code ?? ''}`.toLowerCase();
        return text.includes(term);
      });
    }
    const col = this.sortCol;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = (a[col] ?? '').toString().toLowerCase();
      const bv = (b[col] ?? '').toString().toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }

  get pagedEvents() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEvents.slice(start, start + this.pageSize);
  }

  viewEvent(event: any): void {
    const id = event.id || event._id;
    this.router.navigate(['/event-trigger-detail', id], { queryParams: { viewMode: true } });
  }

  getStatusDotClass(status: number): string {
    switch (status) {
      case 1: return 'dot-active';   
      case 0: return 'dot-inactive'; 
      case 2: return 'dot-draft';   
      default: return 'dot-inactive';
    }
  }

  getStatusLabel(status: number): string {
    switch (status) {
      case 1: return 'Active';
      case 0: return 'Inactive';
      case 2: return 'Draft';
      default: return 'Inactive';
    }
  }
}
