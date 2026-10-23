
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ToastrModule, ToastrService } from 'ngx-toastr';

import { DocumentRequestService } from '../../services/document-request.service';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-service-calendar',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    ToastrModule
  ],
  templateUrl: './service-calendar.component.html',
  styleUrls: ['./service-calendar.component.css']
})
export class ServiceCalendarComponent implements OnInit {
  token: string | null = localStorage.getItem('token');

  allRequests: any[] = [];
  loading = false;
  loadError = '';

  private readonly pageSize = 100;

  today = this.startOfDay(new Date());
  currentMonth = new Date(
    this.today.getFullYear(),
    this.today.getMonth(),
    1
  );
  selectedDate = new Date(this.today);

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: CalendarDay[] = [];

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private documentRequestService: DocumentRequestService
  ) {}

  ngOnInit(): void {
    this.generateCalendar();
    this.loadAllRequests();
  }

  get monthTitle(): string {
    return this.currentMonth.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric'
    });
  }

  get monthRequests(): any[] {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    return this.allRequests.filter(request => {
      const dueDate = this.getDueDate(request);

      return dueDate !== null &&
        dueDate.getFullYear() === year &&
        dueDate.getMonth() === month;
    });
  }

  get selectedRequests(): any[] {
    return this.getRequestsForDate(this.selectedDate);
  }

  // Load service requests from the existing API.
  loadAllRequests(): void {
    if (!this.token) {
      this.toastr.warning('Session expired. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.loadError = '';

    const collected: any[] = [];
    const seenIds = new Set<string | number>();

    const fetchPage = (page: number): void => {
      this.documentRequestService.list({
        search: '',
        page,
        limit: this.pageSize
      }).subscribe({
        next: (response: any) => {
          const rows = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];

          rows.forEach((request: any) => {
            const key = request.id ?? request.requestCode;

            if (key === undefined || !seenIds.has(key)) {
              collected.push(request);

              if (key !== undefined) {
                seenIds.add(key);
              }
            }
          });

          const total = Number(
            response?.totalItems ??
            response?.total ??
            response?.count ??
            0
          );

          const hasMore =
            rows.length === this.pageSize &&
            (total > 0 ? collected.length < total : true);

          if (hasMore) {
            fetchPage(page + 1);
            return;
          }

          this.allRequests = collected;
          this.loading = false;
          this.generateCalendar();
        },
        error: (error: any) => {
          console.error('Failed to load service requests:', error);

          this.loading = false;
          this.loadError =
            error?.error?.message ||
            'Unable to load service requests. Please try again.';

          if (
            error.status === 401 ||
            error.error?.error === 'jwt expired'
          ) {
            localStorage.removeItem('token');
            this.router.navigate(['/login']);
          } else {
            this.toastr.error(this.loadError);
          }
        }
      });
    };

    fetchPage(1);
  }

  // Generate a six-week calendar grid.
  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(
      year,
      month,
      1 - firstDay.getDay()
    );

    this.calendarDays = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      this.calendarDays.push({
        date,
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: this.isSameDate(date, this.today)
      });
    }
  }

  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );

    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );

    this.generateCalendar();
  }

  goToToday(): void {
    this.currentMonth = new Date(
      this.today.getFullYear(),
      this.today.getMonth(),
      1
    );

    this.selectedDate = new Date(this.today);
    this.generateCalendar();
  }

  selectDate(date: Date): void {
    this.selectedDate = new Date(date);

    if (
      date.getMonth() !== this.currentMonth.getMonth() ||
      date.getFullYear() !== this.currentMonth.getFullYear()
    ) {
      this.currentMonth = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      );

      this.generateCalendar();
    }
  }

  isSelectedDate(date: Date): boolean {
    return this.isSameDate(date, this.selectedDate);
  }

  // Read the request's dueDate without shifting date-only values.
  getDueDate(request: any): Date | null {
    if (!request?.dueDate) {
      return null;
    }

    const raw = request.dueDate;

    if (typeof raw === 'string') {
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (match) {
        const date = new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3])
        );

        return isNaN(date.getTime()) ? null : date;
      }
    }

    const date = new Date(raw);

    return isNaN(date.getTime())
      ? null
      : this.startOfDay(date);
  }

  getRequestsForDate(date: Date): any[] {
    return this.allRequests
      .filter(request => {
        const dueDate = this.getDueDate(request);

        return dueDate !== null &&
          this.isSameDate(dueDate, date);
      })
      .sort((a, b) => {
        const nameA = a.taskName || a.requestCode || '';
        const nameB = b.taskName || b.requestCode || '';

        return nameA.localeCompare(nameB);
      });
  }

  // Determine the calendar color from status and due date.
  getStatusClass(request: any): string {
    const status = String(request?.status || 'REQUESTED')
      .trim()
      .toUpperCase();

    if (status === 'COMPLETED') {
      return 'status-completed';
    }

    if (status === 'PAYMENT_DUE') {
      return 'status-payment-due';
    }

    if (status === 'CANCELLED') {
      return 'status-cancelled';
    }

    const dueDate = this.getDueDate(request);

    if (dueDate && dueDate < this.today) {
      return 'status-overdue';
    }

    if (dueDate && dueDate > this.today) {
      return 'status-upcoming';
    }

    return 'status-pending';
  }

  // Open the existing service-request detail page.
  viewServiceRequest(id: number | string): void {
    this.router.navigate(['/view-service-request', id], {
      queryParams: {
        viewMode: 'true'
      }
    });
  }

  private startOfDay(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }

  private isSameDate(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate();
  }
}
