import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserService } from '../../services/user.service';
import { NgxChartsModule, LegendPosition, Color, ScaleType } from '@swimlane/ngx-charts';
import { PlansService } from '../../services/plans.service';
import { ReportService } from '../../services/report.service';

interface ChartPoint { name: string; value: number; }
interface ChartSeries { name: string; series: ChartPoint[]; }

interface TrendGroup {
  byPriority: ChartSeries[];
  byStatus: ChartSeries[];
  total: ChartPoint[];
}

interface DashboardData {
  totalTickets: number;
  pendingTickets: number;
  inProgressTickets: number;
  completedTickets: number;
  reopenedTickets: number;
  slaPercentage: number;
  avgRating: number;
  totalRated: number;
  userChart?: ChartPoint[];
  totalUsersCount?: number;
  projectMonthlyChart?: ChartPoint[];
  totalProjectsCount?: number;
  userSolvedTrend: {
    total: ChartPoint[];
    byProject: ChartSeries[];
  };
  trends: {
    today: TrendGroup;
    week: TrendGroup;
    month: TrendGroup;
    year: TrendGroup;
  };
  ratingChart: ChartPoint[];
  modeOfComplaintChart: ChartPoint[];
  escalationChart: ChartPoint[];
  projectChart: ChartPoint[];
  totalProjectsList?: { id: string | number; name: string }[];
  filteredDateRange: { isFiltered: boolean };
  subscriptionBanner?: SubscriptionBanner | null;
}
interface SubscriptionBanner {
  type: 'trial' | 'buffer' | 'purge';
  show: boolean;
  daysLeft: number;
  title: string;
  message: string;
  buttonText: string;
}

interface PlanInfo {
  id: number;
  plan_name: string;
  plan_price: string;
  billing_cycle: string;
  no_of_users?: number;
  no_of_customers?: number;
  no_of_projects?: number;
  tickets_per_month?: number;
  [key: string]: any;
}
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HttpClientModule, RouterModule, NgxChartsModule, FormsModule, DecimalPipe]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  private refreshTimer: any;
  private countdownTimer: any;
  private rawDashboardData: DashboardData | null = null;

  isLoading = false;
  errorMsg: string | null = null;
  lastUpdated: Date | null = null;
  isFiltered = false;
  isFilterPending = false;

  autoRefresh = true;
  refreshSec = 30;
  countdown = 30;
  readonly INTERVALS = [15, 30, 60, 120];

  dateFrom = '';
  dateTo = '';
  todayDate: string = new Date().toISOString().split('T')[0];

  totalTickets = 0;
  pendingTickets = 0;
  inProgressTickets = 0;
  completedTickets = 0;
  reopenedTickets = 0;
  slaPercentage = 0;
  avgRating = 0;
  totalRated = 0;
  openTickets = 0;
  totalSelectedTickets: number = 0;

  currentTrendView: 'today' | 'week' | 'month' | 'year' = 'week';
  selectedTrendPoint: string | null = null;
  drillDownChartData: ChartSeries[] = [];
  drillDownToggle: 'priority' | 'status' = 'priority';
  isDrillDownView = false;
  drillDownTitle = '';

  trendData: ChartPoint[] = [];
  modeLineChart: any[] = [];
  modeOfComplaintChart: any[] = [];
  ratingChart: any[] = [];
  escalationChart: any[] = [];
  projectChart: any[] = [];

  selectedMode: any = null;
  selectedEscalation: any = null;
  userChart: any[] = [];
  totalUsersCount = 0;
  projectMonthlyChart: any[] = [];
  totalProjectsCount = 0;
  dynamicTimelineLabel = 'Timeline';

  selectedMetric: 'total' | 'priority' | 'status' = 'total';
  trendStackedData: any[] = [];

  userSolvedData: any[] = [];
  userSolvedStackedData: any[] = [];
  projectDeveloperGroups: { projectName: string; developers: { userName: string; count: number }[] }[] = [];

  selectedProjectId: number | string = '';
  allProjectsList: any[] = [];
  selectedUserMetric: 'total' | 'project' = 'total';

  range_type: 'all' | 'today' | 'last_7_days' | 'last_30_days' | 'custom' = 'all';
  rangeError: string | null = null;

  public legendPosition: any = LegendPosition.Below;

  trendScheme: Color = {
    name: 'trend', selectable: true, group: ScaleType.Ordinal, domain: ['#7c3aed']
  };
  stackedScheme: Color = {
    name: 'stacked', selectable: true, group: ScaleType.Ordinal,
    domain: ['#10b981', '#f59e0b', '#7c3aed', '#ef4444', '#06b6d4']
  };
  modeScheme: Color = {
    name: 'mode', selectable: true, group: ScaleType.Ordinal,
    domain: ['#7c3aed', '#f59e0b', '#10b981']
  };
  escalationScheme: Color = {
    name: 'esc', selectable: true, group: ScaleType.Ordinal,
    domain: ['#10b981', '#f59e0b', '#f97316', '#ef4444']
  };
  projectScheme: Color = {
    name: 'proj', selectable: true, group: ScaleType.Ordinal,
    domain: ['#7c3aed', '#8b5cf6', '#a78bfa']
  };
  userScheme: Color = {
    name: 'user', selectable: true, group: ScaleType.Ordinal,
    domain: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7']
  };

  customColors = [
    { name: 'Critical', value: '#ef4444' },
    { name: 'High', value: '#f97316' },
    { name: 'Medium', value: '#f59e0b' },
    { name: 'Low', value: '#3b82f6' },
    { name: 'Very Low', value: '#9ca3af' },
    { name: 'Completed', value: '#10b981' },
    { name: 'Pending', value: '#f59e0b' },
    { name: 'In Progress', value: '#06b6d4' },
    { name: 'Reopened', value: '#ef4444' }
  ];

  projectColorMap: { [key: string]: string } = {};
  expandedProjects: { [key: string]: boolean } = {};
userName: string = '';

isSubAdmin: boolean = false;
subscriptionBanner: SubscriptionBanner | null = null;
currentPlan: PlanInfo | null = null;
assignedPlanId: number | null = null;
availablePlansForCheckout: any[] = [];
  constructor(
    private http: HttpClient,
    private router: Router,
    private userService: UserService,
    private reportService: ReportService,
    private plansService: PlansService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const roleCode = localStorage.getItem('roleCode');
    this.isSubAdmin = roleCode !== 'admin' && roleCode !== 'super_admin';
    this.loadPlanInfoFromLoadingResponse();
    this.fetchDashboard();
    this.startTimers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTimers();
  }


  private loadPlanInfoFromLoadingResponse(): void {
    try {
      const raw = localStorage.getItem('dashboardInfo');
      if (!raw) return;

      const data = JSON.parse(raw);

      this.userName = data.name || '';
      this.currentPlan = data.plan || null;
      this.assignedPlanId = data.plan?.id || null;
      this.availablePlansForCheckout = data.available_plans || [];
    } catch (e) {
      console.error('Error parsing dashboardInfo from localStorage', e);
    }
  }

  private fetchPaidPlans(): void {
    this.plansService.getPaidPlans({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.availablePlansForCheckout = res.data || [];
          try {
            const raw = localStorage.getItem('dashboardInfo');
            const data = JSON.parse(raw || '{}');
            data.available_plans = res.data || [];
            localStorage.setItem('dashboardInfo', JSON.stringify(data));
          } catch (e) { }
        },
        error: (err) => console.error('Failed to fetch paid plans', err)
      });
  }


  goToCheckout(): void {
    if (!this.availablePlansForCheckout.length) {
      this.fetchPaidPlans();
    }

    const paymentData: any = {
      user_id: localStorage.getItem('user_id'),
      name: this.userName || localStorage.getItem('name'),
      plan: this.currentPlan || null,
      available_plans: this.availablePlansForCheckout,
      can_change_plan: this.availablePlansForCheckout.length > 0,
      skip: this.subscriptionBanner?.type === 'buffer',
      message: this.subscriptionBanner?.message || 'Renew your subscription to continue.',
    };
    this.router.navigate(['/checkout'], { state: { paymentData } });
  }
  fetchDashboard(): void {
    this.isLoading = true;
    this.rangeError = null;

    const payload = {
      range_type: this.range_type || 'all',
      startDate: this.range_type === 'custom' ? this.dateFrom : null,
      endDate: this.range_type === 'custom' ? this.dateTo : null,
      projectId: this.selectedProjectId || null
    };

    this.reportService.getDashboard(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res?.success) {
            this.mapData(res.data);
            if (res.data.totalProjectsList) {
              this.allProjectsList = res.data.totalProjectsList;
            }
            this.lastUpdated = new Date();
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isLoading = false;
          if (err.status === 400) {
            this.rangeError = err.error?.message || 'Max 30 days allowed for custom range';
          } else {
            this.errorMsg = 'Failed to fetch dashboard data';
          }
          this.cdr.markForCheck();
        }
      });
  }
  private mapData(d: DashboardData): void {
    this.rawDashboardData = d;

    this.subscriptionBanner = this.isSubAdmin
  ? null
  : (d.subscriptionBanner || null);
    if (this.subscriptionBanner?.show && !this.availablePlansForCheckout.length) {
      this.fetchPaidPlans();
    }

    this.totalTickets = d.totalTickets || 0;
    this.pendingTickets = d.pendingTickets || 0;
    this.inProgressTickets = d.inProgressTickets || 0;
    this.completedTickets = d.completedTickets || 0;
    this.reopenedTickets = d.reopenedTickets || 0;
    this.openTickets = this.pendingTickets + this.inProgressTickets + this.reopenedTickets;
    this.slaPercentage = d.slaPercentage || 0;
    this.avgRating = d.avgRating || 0;
    this.totalRated = d.totalRated || 0;
    this.isFiltered = !!d.filteredDateRange?.isFiltered;

    this.ratingChart = d.ratingChart || [];

    if (d.escalationChart && d.escalationChart.length > 0) {
      this.escalationChart = d.escalationChart.map(item => {
        const levelNumber = item.name.replace(/\D/g, '');
        return {
          ...item,
          name: `L${levelNumber || item.name}: (${item.value})`
        };
      });
    } else {
      this.escalationChart = [];
    }

    if (d.projectChart && d.projectChart.length > 0) {
      const statusTotals: { [key: string]: number } = {};
      d.projectChart.forEach((project: any) => {
        project.series.forEach((s: any) => {
          statusTotals[s.name] = (statusTotals[s.name] || 0) + s.value;
        });
      });
      this.projectChart = d.projectChart.map((project: any) => ({
        name: project.name,
        series: project.series.map((s: any) => ({
          name: `${s.name} (${statusTotals[s.name] || 0})`,
          value: s.value,
          extra: { originalName: s.name }
        }))
      }));
    } else {
      this.projectChart = [];
    }

    this.modeOfComplaintChart = d.modeOfComplaintChart || [];
    this.modeLineChart = [{ name: 'Mode', series: this.modeOfComplaintChart }];
    this.userChart = d.userChart || [];
    this.totalUsersCount = d.totalUsersCount || 0;
    this.projectMonthlyChart = d.projectMonthlyChart || [];
    this.totalProjectsCount = d.totalProjectsCount || 0;

    this.updateTrendLogic();
    this.updateDynamicLabel();

    this.userSolvedData = d.userSolvedTrend?.total || [];
    this.userSolvedStackedData = d.userSolvedTrend?.byProject || [];
    this.transformToProjectWise(this.userSolvedStackedData);

    this.lastUpdated = new Date();
    this.cdr.markForCheck();
  }

  transformToProjectWise(stackedData: any[]): void {
    if (!stackedData || stackedData.length === 0) {
      this.projectDeveloperGroups = [];
      this.projectColorMap = {};
      return;
    }

    this.projectColorMap = {};
    const projectMap: { [key: string]: any[] } = {};
    const colorDomain = this.stackedScheme.domain;
    let colorIndex = 0;

    stackedData.forEach(user => {
      user.series?.forEach((proj: any) => {
        if (proj.value > 0) {
          if (!projectMap[proj.name]) {
            projectMap[proj.name] = [];
            this.projectColorMap[proj.name] = colorDomain[colorIndex % colorDomain.length];
            colorIndex++;
          }
          projectMap[proj.name].push({ userName: user.name, count: proj.value });
        }
      });
    });

    this.projectDeveloperGroups = Object.keys(projectMap).map(name => ({
      projectName: name,
      developers: projectMap[name]
    }));
  }

  onUserMetricChange(metric: 'total' | 'project'): void {
    this.selectedUserMetric = metric;
    this.cdr.markForCheck();
  }

  private updateTrendLogic(): void {
    if (!this.rawDashboardData?.trends) return;
    const viewData = this.rawDashboardData.trends[this.currentTrendView];

    if (this.selectedMetric === 'total') {
      this.trendData = viewData.total || [];
    } else {
      const rawData = this.selectedMetric === 'priority' ? viewData.byPriority : viewData.byStatus;
      const totals: { [key: string]: number } = {};

      rawData.forEach((group: any) => {
        group.series.forEach((s: any) => {
          totals[s.name] = (totals[s.name] || 0) + s.value;
        });
      });

      this.trendStackedData = rawData.map((group: any) => ({
        name: group.name,
        series: group.series
          .filter((s: any) => s.value > 0)
          .map((s: any) => ({
            name: `${s.name} (${totals[s.name] || 0})`,
            value: s.value,
            extra: { originalName: s.name }
          }))
      }));

      this.trendData = this.trendStackedData.map(item => ({
        name: item.name,
        value: item.series.reduce((sum: number, s: any) => sum + (s.value || 0), 0)
      }));
    }
    this.cdr.markForCheck();
  }

  onMetricChange(metric: 'total' | 'priority' | 'status'): void {
    this.selectedMetric = metric;
    this.updateTrendLogic();
  }

  private updateDynamicLabel(): void {
    const now = new Date();
    const date = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();

    if (this.currentTrendView === 'today') {
      this.dynamicTimelineLabel = `Today (${date}-${month}-${year})`;
    } else if (this.currentTrendView === 'week') {
      this.dynamicTimelineLabel = 'This week';
    } else if (this.currentTrendView === 'month') {
      const monthName = now.toLocaleString('en-IN', { month: 'short' });
      this.dynamicTimelineLabel = `(${monthName} ${year})`;
    } else if (this.currentTrendView === 'year') {
      this.dynamicTimelineLabel = `(${year})`;
    }
    this.cdr.markForCheck();
  }

  get dynamicColors(): any[] {
    const colors: any[] = [];
    const colorMap: { [key: string]: string } = {
      Critical: '#ef4444',
      High: '#f97316',
      Medium: '#f59e0b',
      Low: '#3b82f6',
      Completed: '#10b981',
      'In Progress': '#06b6d4',
      Reopened: '#ef4444',
      Pending: '#f59e0b'
    };

    this.trendStackedData.forEach(group => {
      group.series.forEach((s: any) => {
        const original = s.extra?.originalName || s.name;
        if (colorMap[original]) {
          colors.push({ name: s.name, value: colorMap[original] });
        }
      });
    });
    return colors;
  }

  setTrendView(view: 'today' | 'week' | 'month' | 'year'): void {
    this.currentTrendView = view;
    this.selectedTrendPoint = null;
    this.updateTrendLogic();
    this.updateDynamicLabel();
  }

  onTrendClick(event: any): void {
    const pointName = (typeof event === 'string') ? event : (event?.name || event);
    if (!pointName) return;

    this.selectedTrendPoint = pointName;
    this.drillDownTitle = `Details for ${this.selectedTrendPoint}`;
    this.isDrillDownView = true;
    this.drillDownToggle = 'priority';

    this.updateDrillDownChart();

    if (this.drillDownChartData && this.drillDownChartData.length > 0) {
      this.drillDownChartData = this.drillDownChartData.map(group => ({
        ...group,
        series: group.series.filter((s: any) => s.value > 0)
      }));
      const selectedData = this.drillDownChartData[0];
      if (selectedData?.series) {
        this.totalSelectedTickets = selectedData.series.reduce(
          (sum: number, item: any) => sum + (item.value || 0), 0
        );
      } else {
        this.totalSelectedTickets = 0;
      }
    } else {
      this.totalSelectedTickets = 0;
    }
  }

  setDrillDownToggle(type: 'priority' | 'status'): void {
    this.drillDownToggle = type;
    this.updateDrillDownChart();
    if (this.drillDownChartData.length > 0 && this.drillDownChartData[0].series) {
      this.totalSelectedTickets = this.drillDownChartData[0].series.reduce(
        (sum: number, item: any) => sum + (item.value || 0), 0
      );
    } else {
      this.totalSelectedTickets = 0;
    }
  }

  private updateDrillDownChart(): void {
    if (!this.selectedTrendPoint || !this.rawDashboardData?.trends) return;
    const viewData = this.rawDashboardData.trends[this.currentTrendView];
    const sourceData = this.drillDownToggle === 'priority'
      ? viewData.byPriority
      : viewData.byStatus;
    const pointData = sourceData?.find(d => d.name === this.selectedTrendPoint);
    this.drillDownChartData = pointData ? [pointData] : [];
    this.cdr.markForCheck();
  }

  onRangeTypeChange(autoApply = false): void {
    this.rangeError = null;
    this.isFilterPending = true;

    if (this.range_type !== 'custom') {
      this.dateFrom = '';
      this.dateTo = '';
    }

    if (this.range_type !== 'all') {
      this.isFiltered = true;
    }

    if (autoApply) {
      this.applyFilter();
    }
  }

  applyFilter(): void {
    this.rangeError = null;

    if (this.range_type === 'custom') {
      if (!this.dateFrom || !this.dateTo) {
        this.rangeError = 'Please select both From and To date';
        return;
      }
      if (new Date(this.dateFrom) > new Date(this.dateTo)) {
        this.rangeError = 'From date cannot be greater than To date';
        return;
      }
    }

    this.isFilterPending = false;
    this.isFiltered = true;
    this.fetchDashboard();
  }

  clearFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.range_type = 'all';
    this.selectedProjectId = '';
    this.rangeError = null;
    this.isFilterPending = false;
    this.isFiltered = false;
    this.fetchDashboard();
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    this.startTimers();
  }

  setRefreshInterval(sec: number): void {
    this.refreshSec = sec;
    this.startTimers();
  }

  onModeSelect1(event: any): void { this.selectedMode = event; }
  onEscalationSelect(event: any): void { this.selectedEscalation = event; }

  getPct = (val: number): number =>
    this.totalTickets ? Math.round((val / this.totalTickets) * 100) : 0;

  getRating = (stars: number): number =>
    this.ratingChart.find(r => +r.name === stars)?.value || 0;

  getRatingPct = (val: number): number =>
    this.totalRated ? Math.round((val / this.totalRated) * 100) : 0;

  yFmt = (val: number): string =>
    Number.isInteger(val) ? val.toString() : '';

  formatTime(): string {
    return this.lastUpdated
      ? this.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
  }

  get slaColor(): string {
    if (this.slaPercentage >= 80) return '#10b981';
    if (this.slaPercentage >= 50) return '#f59e0b';
    return '#ef4444';
  }

  get trendLabel(): string {
    const labels: Record<string, string> = {
      today: 'Today', week: 'This Week', month: 'This Month', year: 'This Year'
    };
    return this.isFiltered
      ? 'Filtered Trend'
      : `Ticket Volume (${labels[this.currentTrendView]})`;
  }

  get countdownDash(): number {
    return 87.96 * (1 - (this.countdown / this.refreshSec));
  }

  private startTimers(): void {
    this.clearTimers();
    this.countdown = this.refreshSec;

    this.countdownTimer = setInterval(() => {
      this.countdown = Math.max(0, this.countdown - 1);
      this.cdr.markForCheck();
    }, 1000);

    if (this.autoRefresh) {
      this.refreshTimer = setInterval(() => {
        this.fetchDashboard();
        this.countdown = this.refreshSec;
      }, this.refreshSec * 1000);
    }
  }

  private clearTimers(): void {
    if (this.countdownTimer) { clearInterval(this.countdownTimer); }
    if (this.refreshTimer) { clearInterval(this.refreshTimer); }
  }

  goBackToMain(): void {
    this.isDrillDownView = false;
    this.selectedTrendPoint = null;
  }

  get totalResolved(): number {
    return this.userSolvedData.reduce((sum, d) => sum + (d.value || 0), 0);
  }

  get avgTicketsPerUser(): string {
    if (!this.userSolvedData.length) return '0';
    return (this.totalResolved / this.userSolvedData.length).toFixed(1);
  }

  getProjectTotal(developers: { userName: string; count: number }[]): number {
    return developers.reduce((sum, d) => sum + (d.count || 0), 0);
  }

  getDevBarWidth(count: number, developers: { userName: string; count: number }[]): number {
    const max = Math.max(...developers.map(d => d.count), 1);
    return Math.max(8, Math.round((count / max) * 100));
  }

  toggleProject(projectName: string): void {
    const currentState = !!this.expandedProjects[projectName];
    this.expandedProjects = {};
    this.expandedProjects[projectName] = !currentState;
  }

  onProjectChange(): void {
    this.isFilterPending = true;
    if (this.selectedProjectId) {
      this.isFiltered = true;
    }
  }

  onDateChange(): void {
    this.isFilterPending = true;
    if (this.dateFrom || this.dateTo) {
      this.isFiltered = true;
    }
  }


  ratingBarScheme: Color = {
    name: 'rating',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444']
  };

  ratingCustomColors = [
    { name: '5 ★', value: '#10b981' },
    { name: '4 ★', value: '#84cc16' },
    { name: '3 ★', value: '#f59e0b' },
    { name: '2 ★', value: '#f97316' },
    { name: '1 ★', value: '#ef4444' },
  ];



  get ratingBarData(): { name: string; value: number }[] {
    return [5, 4, 3, 2, 1].map(star => ({
      name: `${star} ★`,
      value: this.getRatingPct(this.getRating(star))
    }));
  }



  getStarIcons(rating: number): string[] {
    const icons: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        icons.push('bi-star-fill');
      } else if (i - rating < 1) {
        icons.push('bi-star-half');
      } else {
        icons.push('bi-star');
      }
    }
    return icons;
  }



  pctFmt = (val: number): string => `${val}%`;



}
