import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef,ChangeDetectorRef
} from '@angular/core';
import { CommonModule} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

import {
  ReportSuperService, ReportData, AdminPerformanceReport, RangeType
} from '../../services/reportSuper.service';
import {
  SuperAdminDashboardService
} from '../../services/super-admin-dashboard.service';

Chart.register(...registerables);

@Component({
  selector: 'app-reports-dashboard',
   standalone: true,
  imports: [CommonModule, FormsModule],

  templateUrl: './reports-dashboard.component.html',
  styleUrl: './reports-dashboard.component.scss'
})
export class ReportsDashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('priorityCanvas')   priorityCanvas!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('statusCanvas')     statusCanvas!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('modeCanvas')       modeCanvas!:       ElementRef<HTMLCanvasElement>;
  @ViewChild('escalationCanvas') escalationCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendCanvas')      trendCanvas!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('agingCanvas')      agingCanvas!:      ElementRef<HTMLCanvasElement>;

  loading       = false;
  exportingPDF  = false;
  exportingExcel = false;
sessionsLoading = false;
activityLoading = false;

sessions: any[] = [];
activities: any[] = [];
  data: ReportData | null = null;

  selectedRange: RangeType = 'all';
  customStart = '';
  customEnd   = '';

activeTab:
| 'overview'
| 'tickets'
| 'admins'
| 'sessions'
| 'activity' = 'overview';
  rangeOptions: { label: string; value: RangeType }[] = [
    { label: 'All time',      value: 'all' },
    { label: 'Today',         value: 'today' },
    { label: 'Last 7 days',   value: 'last_7_days' },
    { label: 'Last 30 days',  value: 'last_30_days' },
    { label: 'Custom range',  value: 'custom' },
  ];

  private charts: { [key: string]: Chart } = {};
  private destroy$ = new Subject<void>();

  showExportModal = false;
  exportType: 'pdf' | 'excel' = 'pdf';

chartOptions = [
  {
    key: 'metrics',
    label: '1. Key Metrics',
    selected: true
  },

  {
    group: '2. Ticket Distribution',
    children: [
      {
        key: 'priority',
        label: '(a) By Priority',
        selected: true
      },
      {
        key: 'status',
        label: '(b) By Status',
        selected: true
      },
      {
        key: 'mode',
        label: '(c) By Mode of Complaint',
        selected: true
      }
    ]
  },

  {
    key: 'aging',
    label: '3. Unresolved Ticket Aging',
    selected: true
  },

  {
    key: 'trend',
    label: '4. Monthly Ticket Volume',
    selected: true
  },

  {
    key: 'adminPerformance',
    label: '5. Admin Performance',
    selected: true
  }
];
  private readonly COLORS = [
    '#3266ad','#1d9e75','#ba7517','#e24b4a','#534ab7','#888780','#16a7c4','#e8871e'
  ];

  constructor(private svc: ReportSuperService,
    private superAdminSvc: SuperAdminDashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    Object.values(this.charts).forEach(c => c.destroy());
  }

  loadReport(): void {
    this.loading = true;
    this.svc
      .getOverviewSummary(this.selectedRange, this.customStart, this.customEnd)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (d) => {
          this.data = d;
          this.cdr.detectChanges();

       setTimeout(() => {
  this.cdr.detectChanges();
  this.drawAllCharts();
}, 0);
        },
        error: (err) => console.error('[Reports load error]', err),
      });
  }

  applyFilters(): void {
    if (this.selectedRange === 'custom') {
      if (!this.customStart || !this.customEnd) return;
    }
    this.loadReport();
  }

  clearFilters(): void {
    this.selectedRange = 'all';
    this.customStart   = '';
    this.customEnd     = '';
    this.loadReport();
  }

  onRangeChange(): void {}

  applyCustomRange(): void {}

 switchTab(tab: typeof this.activeTab): void {
  this.activeTab = tab;

  if (tab === 'sessions' && this.sessions.length === 0) {
    this.loadSessions();
  }

  if (tab === 'activity' && this.activities.length === 0) {
    this.loadActivity();
  }

  if (tab === 'tickets' || tab === 'overview') {
    this.cdr.detectChanges();

    setTimeout(() => {
      this.cdr.detectChanges();
      this.drawAllCharts();
    }, 0);
  }
}

  openExport(type: 'pdf' | 'excel'): void {
    this.exportType = type;
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }


selectAllCharts(): void {
  this.chartOptions.forEach((item: any) => {

    if (item.children) {
      item.children.forEach((c: any) => c.selected = true);
    } else {
      item.selected = true;
    }

  });
}

deselectAllCharts(): void {
  this.chartOptions.forEach((item: any) => {

    if (item.children) {
      item.children.forEach((c: any) => c.selected = false);
    } else {
      item.selected = false;
    }

  });
}

  get selectedChartKeys(): string[] {
  return this.chartOptions.flatMap((item: any) => {

    if (item.children) {
      return item.children
        .filter((c: any) => c.selected)
        .map((c: any) => c.key);
    }

    return item.selected ? [item.key] : [];
  });
}
get totalChartKeysCount(): number {
  return this.chartOptions.reduce((total: number, item: any) => {
    return total + (item.children ? item.children.length : 1);
  }, 0);
}

applyViewFilter(): void {
  this.showExportModal = false;
  this.cdr.detectChanges();
  setTimeout(() => {
    this.cdr.detectChanges();
    this.drawAllCharts();
  }, 0);
}
 confirmExport(): void {
  const selected = this.selectedChartKeys;
  if (!selected.length) {
    alert('Please select at least one chart to export.');
    return;
  }

  this.showExportModal = false;
  this.cdr.detectChanges();

  setTimeout(() => {
    this.cdr.detectChanges();
    this.drawAllCharts();
  }, 0);

  if (this.exportType === 'pdf') {
    this.exportingPDF = true;
    this.svc.exportPDF(this.selectedRange, this.customStart, this.customEnd, selected);
    setTimeout(() => this.exportingPDF = false, 3000);
  } else {
    this.exportingExcel = true;
    this.svc.exportExcel(this.selectedRange, this.customStart, this.customEnd, selected);
    setTimeout(() => this.exportingExcel = false, 3000);
  }
}

isChartSelected(key: string): boolean {
  for (const item of this.chartOptions as any[]) {
    if (item.children) {
      const child = item.children.find((c: any) => c.key === key);
      if (child) return child.selected;
    } else if (item.key === key) {
      return item.selected;
    }
  }
  return false;
}
  downloadPDF(): void { this.openExport('pdf'); }
downloadExcel(): void { this.openExport('excel'); }

  private destroyChart(key: string): void {
    if (this.charts[key]) { this.charts[key].destroy(); delete this.charts[key]; }
  }

  private drawAllCharts(): void {
    if (!this.data) return;
    const { charts } = this.data;

    this.drawDoughnut('priority',   this.priorityCanvas,   charts.priority,   'name', 'value');
    this.drawDoughnut('status',     this.statusCanvas,     charts.status,     'name', 'value');
    this.drawDoughnut('mode',       this.modeCanvas,       charts.mode,       'name', 'value');
    this.drawBar('escalation',      this.escalationCanvas, charts.escalation, 'name', 'value');
    this.drawLine('trend',          this.trendCanvas,      charts.monthlyTrend);
    this.drawBar('aging',           this.agingCanvas,      charts.ticketAging,'label','count');
  }

  private drawDoughnut(
    key: string, ref: ElementRef<HTMLCanvasElement>,
    items: any[], labelKey: string, valueKey: string
  ): void {
    if (!ref?.nativeElement || !items?.length) return;
    this.destroyChart(key);
    this.charts[key] = new Chart(ref.nativeElement, {
      type: 'doughnut',
      data: {
        labels: items.map(i => i[labelKey]),
        datasets: [{
          data: items.map(i => i[valueKey]),
          backgroundColor: this.COLORS.slice(0, items.length),
          hoverOffset: 4,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } }
        },
      },
    });
  }

  private drawBar(
    key: string, ref: ElementRef<HTMLCanvasElement>,
    items: any[], labelKey: string, valueKey: string
  ): void {
    if (!ref?.nativeElement || !items?.length) return;
    this.destroyChart(key);
    this.charts[key] = new Chart(ref.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map(i => i[labelKey]),
        datasets: [{
          data: items.map(i => i[valueKey]),
          backgroundColor: this.COLORS.slice(0, items.length),
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  private drawLine(
    key: string, ref: ElementRef<HTMLCanvasElement>, items: any[]
  ): void {
    if (!ref?.nativeElement || !items?.length) return;
    this.destroyChart(key);

    const labels = items.map(i => {
      const [y, m] = (i.month || i.name || '').split('-');
      return new Date(+y, +m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
    });

    this.charts[key] = new Chart(ref.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Tickets created',
          data: items.map(i => i.count ?? i.value),
          borderColor: '#3266ad',
          backgroundColor: 'rgba(50,102,173,0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#3266ad',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  get slaColor(): string {
    const p = this.data?.summary.slaMetPercentage ?? 0;
    return p >= 80 ? 'success' : p >= 60 ? 'warn' : 'danger';
  }

  get ratingStars(): string {
    const r = this.data?.summary.avgCustomerRating ?? 0;
    return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
  }

  resolutionColor(rate: number): string {
    return rate >= 80 ? '#1d9e75' : rate >= 50 ? '#ba7517' : '#e24b4a';
  }


  trackById(_: number, item: any): number {
  return item.id ?? item.adminId;
}
  loadSessions(adminId?: number): void {
  this.sessionsLoading = true;

  this.superAdminSvc.getUserSessions(adminId)
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.sessionsLoading = false)
    )
    .subscribe({
      next: (res: any) => {
        this.sessions = res?.data ?? res ?? [];
      },
      error: () => {
        this.sessions = [];
      }
    });
}

loadActivity(): void {
  this.activityLoading = true;

  this.superAdminSvc.getUserActivity()
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.activityLoading = false)
    )
    .subscribe({
      next: (res: any) => {
        this.activities = res?.data ?? res ?? [];
      },
      error: () => {
        this.activities = [];
      }
    });
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

isSessionActive(session: any): boolean {
  if (!session.session_ended) return true;

  const ended = new Date(session.session_ended);

  return (
    Date.now() - ended.getTime()
  ) < 15 * 60 * 1000;
}

timeAgo(dateStr: string): string {
  const diff =
    Date.now() -
    new Date(dateStr).getTime();

  if (diff < 60000)
    return 'just now';

  if (diff < 3600000)
    return `${Math.floor(diff / 60000)}m ago`;

  if (diff < 86400000)
    return `${Math.floor(diff / 3600000)}h ago`;

  return `${Math.floor(diff / 86400000)}d ago`;
}
downloadChart(chartKey: string) {

const chart = this.charts[chartKey];

if (!chart) return;

const link =
document.createElement('a');

link.href =
chart.toBase64Image();

link.download =
`${chartKey}-${Date.now()}.png`;

link.click();

}
}
