import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import {
  SuperAdminDashboardService,
  SuperAdminDashboardData,
  AdminAcquisitionItem,
  RangeType,
} from '../../services/super-admin-dashboard.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
   standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('priorityCanvas')   priorityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusCanvas')     statusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('escalationCanvas') escalationCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('modeCanvas')       modeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendCanvas')      trendCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('acquisitionCanvas') acquisitionCanvas!: ElementRef<HTMLCanvasElement>;

  loading = true;


  dashboard: SuperAdminDashboardData | null = null;
  acquisition: AdminAcquisitionItem[] = [];

  selectedRange: RangeType = 'all';
  customStart = '';
  customEnd = '';
activeTab: 'overview' = 'overview';
  rangeOptions: { label: string; value: RangeType }[] = [
    { label: 'All time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Last 7 days', value: 'last_7_days' },
    { label: 'Last 30 days', value: 'last_30_days' },
    { label: 'Custom range', value: 'custom' },
  ];

  private charts: { [key: string]: Chart } = {};
  private destroy$ = new Subject<void>();

  private readonly COLORS = ['#3266ad','#1d9e75','#ba7517','#e24b4a','#534ab7','#888780'];

  constructor(private svc: SuperAdminDashboardService,
        private cdr: ChangeDetectorRef

  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    Object.values(this.charts).forEach((c) => c.destroy());
  }

 
  loadDashboard(): void {
    this.loading = true;

    this.svc
      .loadAll(this.selectedRange, this.customStart || undefined, this.customEnd || undefined)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: ({ dashboard, acquisition }) => {
          this.dashboard = dashboard;
          this.acquisition = acquisition;
          
          this.cdr.detectChanges();
          setTimeout(() => {
            this.cdr.detectChanges();
            this.drawAllCharts();
          }, 0);
        },
        error: (err) => console.error('[Dashboard load error]', err),
      });
  }

  applyFilters(): void {
    if (this.selectedRange === 'custom') {
      if (!this.customStart || !this.customEnd) return;
    }
    this.loadDashboard();
  }

  clearFilters(): void {
    this.selectedRange = 'all';
    this.customStart   = '';
    this.customEnd     = '';
    this.loadDashboard();
  }

  onRangeChange(): void {}
  applyCustomRange(): void {}






switchTab(): void {
  this.activeTab = 'overview';

  this.cdr.detectChanges();

  setTimeout(() => {
    this.drawAllCharts();
  });
}





 
  private destroyChart(key: string): void {
    if (this.charts[key]) { this.charts[key].destroy(); delete this.charts[key]; }
  }

  private drawAllCharts(): void {
    if (!this.dashboard) return;
    this.drawDoughnut('priority',    this.priorityCanvas,   this.dashboard.priorityChart);
    this.drawDoughnut('status',      this.statusCanvas,     this.dashboard.statusChart);
    this.drawBar('escalation',       this.escalationCanvas, this.dashboard.escalationChart);
    this.drawDoughnut('mode',        this.modeCanvas,       this.dashboard.modeChart);
    this.drawTrendLine('trend',      this.trendCanvas,      this.dashboard.monthlyTrend);
    this.drawAcquisitionBar('acq',   this.acquisitionCanvas, this.acquisition);
  }

  private drawDoughnut(
    key: string,
    ref: ElementRef<HTMLCanvasElement>,
    items: { name: string; value: number }[]
  ): void {
    if (!ref?.nativeElement) return;
    this.destroyChart(key);
    this.charts[key] = new Chart(ref.nativeElement, {
      type: 'doughnut',
      data: {
        labels: items.map((i) => i.name),
        datasets: [{
          data: items.map((i) => i.value),
          backgroundColor: this.COLORS.slice(0, items.length),
          hoverOffset: 4,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: { legend: { display: false } },
      },
    });
  }

  private drawBar(
    key: string,
    ref: ElementRef<HTMLCanvasElement>,
    items: { name: string; value: number }[]
  ): void {
    if (!ref?.nativeElement) return;
    this.destroyChart(key);
    this.charts[key] = new Chart(ref.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map((i) => i.name),
        datasets: [{
          data: items.map((i) => i.value),
          backgroundColor: this.COLORS.slice(0, items.length),
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  private drawTrendLine(
    key: string,
    ref: ElementRef<HTMLCanvasElement>,
    items: { name: string; value: number }[]
  ): void {
    if (!ref?.nativeElement) return;
    this.destroyChart(key);
    const labels = items.map((i) => {
      const [y, m] = i.name.split('-');
      return new Date(+y, +m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
    });
    this.charts[key] = new Chart(ref.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Tickets created',
          data: items.map((i) => i.value),
          borderColor: '#3266ad',
          backgroundColor: 'rgba(50,102,173,0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  private drawAcquisitionBar(
    key: string,
    ref: ElementRef<HTMLCanvasElement>,
    items: AdminAcquisitionItem[]
  ): void {
    if (!ref?.nativeElement || !items.length) return;
    this.destroyChart(key);
    const labels = items.map((i) => {
      const [y, m] = i.month.split('-');
      return new Date(+y, +m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
    });
    this.charts[key] = new Chart(ref.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'New admins',
          data: items.map((i) => i.count),
          backgroundColor: '#534ab7',
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
        },
      },
    });
  }

 
  get slaColor(): string {
    const pct = this.dashboard?.summary.slaMetPercentage ?? 0;
    if (pct >= 80) return 'success';
    if (pct >= 60) return 'warn';
    return 'danger';
  }

 getInitials(name?: string): string {
  if (!name) return '?';

  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
  trackById(_: number, item: any): number {
  return item.id ?? item.adminId;
}
}
