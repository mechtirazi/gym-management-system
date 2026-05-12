import { Component, OnInit, inject, signal, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  NgApexchartsModule,
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexGrid,
  ApexYAxis,
  ApexTooltip,
  ApexTheme,
  ApexFill,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexLegend,
  ApexPlotOptions
} from 'ng-apexcharts';
import { AdminAnalyticsService, RevenueAnalytics } from '../../../../../core/services/admin-analytics.service';
import { AdminGymsService } from '../../../../../core/services/admin-gyms.service';
import { ThemeService } from '../../../../../core/services/theme.service';
import { GymDto } from '../../../../../core/models/api.models';
import { catchError, finalize, of, forkJoin } from 'rxjs';

export type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  theme: ApexTheme;
  fill: ApexFill;
  colors: string[];
};

export type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  responsive: ApexResponsive[];
  labels: any;
  theme: ApexTheme;
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
};

@Component({
  selector: 'app-revenue-analytics',
  standalone: true,
  imports: [CommonModule, MatIconModule, NgApexchartsModule],
  templateUrl: './revenue-analytics.component.html',
  styleUrl: './revenue-analytics.component.scss'
})
export class RevenueAnalyticsComponent implements OnInit {
  private analyticsService = inject(AdminAnalyticsService);
  private gymsService = inject(AdminGymsService);
  private themeService = inject(ThemeService);

  loading = signal(true);
  error = signal<string | null>(null);
  mrr = signal(0);
  eliteRevenue = signal(0);
  activeSubscriptions = signal(0);
  arpu = signal(0);
  mrrGrowth = signal(0);
  isHealthyGrowth = signal(true);
  totalMembers = signal(0);

  atRiskRevenue = signal(0);
  churnedRevenue = signal(0);
  expiringGyms = signal<GymDto[]>([]);

  platformInsights = signal<{ icon: string, text: string, type: 'positive' | 'warning' | 'neutral', action?: string, actionFn?: () => void }[]>([]);

  actionLoading = signal<string | null>(null);

  public lineChartOptions: Partial<LineChartOptions> | any;
  public memberDonutOptions: Partial<DonutChartOptions> | any;
  public gymSubDonutOptions: Partial<DonutChartOptions> | any;

  constructor() {
    effect(() => {
      // Access signal to register dependency
      this.themeService.darkMode();
      this.updateChartThemes();
    });
  }

  ngOnInit() {
    this.initChartOptions();
    this.loadData();
  }

  private initChartOptions() {
    this.lineChartOptions = {
      series: [{ name: "Revenue", data: [0, 0, 0, 0, 0, 0] }],
      chart: {
        height: 300,
        type: "area",
        toolbar: { show: false },
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'transparent',
        animations: { enabled: true, easing: 'easeinout', speed: 800 }
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3, colors: ['#6366f1'] }, // Sleek Indigo
      colors: ['#6366f1'],
      fill: {
        type: "gradient",
        gradient: {
          shade: 'dark',
          type: "vertical",
          shadeIntensity: 1,
          opacityFrom: 0.6,
          opacityTo: 0,
          stops: [0, 100],
          colorStops: [
            [
              { offset: 0, color: "#818cf8", opacity: 0.5 },
              { offset: 100, color: "#4f46e5", opacity: 0 }
            ]
          ]
        }
      },
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        strokeDashArray: 4,
        padding: { left: 10, right: 10, bottom: 0 },
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } }
      },
      xaxis: {
        categories: [],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' } }
      },
      yaxis: {
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' },
          formatter: (val: number) => `${val.toLocaleString()} TND`
        }
      },
      tooltip: {
        theme: 'dark',
        x: { show: true },
        marker: { show: true }
      }
    };

    // Common donut config
    const donutBase = {
      chart: {
        type: "donut",
        height: 240,
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'transparent'
      },
      stroke: { show: true, width: 2, colors: ['rgba(0,0,0,0)'] },
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              name: { show: true, fontSize: '12px', fontWeight: 700, color: '#94a3b8', offsetY: -10 },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 900,
                color: '#ffffff',
                offsetY: 10,
                formatter: (val: string) => val
              },
              total: {
                show: true,
                label: 'TOTAL',
                color: '#475569',
                fontSize: '10px',
                fontWeight: 800,
                formatter: (w: any) => {
                  return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                }
              }
            }
          }
        }
      },
      legend: { show: false },
      tooltip: { theme: 'dark' }
    };

    this.memberDonutOptions = {
      ...donutBase,
      series: [0, 0],
      labels: ["Standard", "Elite"],
      colors: ['#34d399', '#a78bfa'] // Emerald, Soft Purple
    };

    this.gymSubDonutOptions = {
      ...donutBase,
      series: [0, 0, 0],
      labels: ["Monthly", "Semester", "Yearly"],
      colors: ['#60a5fa', '#34d399', '#fbbf24'] // Distinct: Blue, Emerald, Amber
    };
  }

  private updateChartThemes() {
    const isDark = this.themeService.darkMode();
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const valueColor = isDark ? '#ffffff' : '#0f172a';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    this.lineChartOptions = {
      ...this.lineChartOptions,
      grid: { ...this.lineChartOptions.grid, borderColor },
      xaxis: {
        ...this.lineChartOptions.xaxis,
        labels: { ...this.lineChartOptions.xaxis.labels, style: { ...this.lineChartOptions.xaxis.labels.style, colors: labelColor } }
      },
      yaxis: {
        ...this.lineChartOptions.yaxis,
        labels: { ...this.lineChartOptions.yaxis.labels, style: { ...this.lineChartOptions.yaxis.labels.style, colors: labelColor } }
      },
      tooltip: { ...this.lineChartOptions.tooltip, theme: isDark ? 'dark' : 'light' }
    };

    const updateDonut = (options: any) => ({
      ...options,
      plotOptions: {
        ...options.plotOptions,
        pie: {
          ...options.plotOptions.pie,
          donut: {
            ...options.plotOptions.pie.donut,
            labels: {
              ...options.plotOptions.pie.donut.labels,
              name: { ...options.plotOptions.pie.donut.labels.name, color: labelColor },
              value: { ...options.plotOptions.pie.donut.labels.value, color: valueColor }
            }
          }
        }
      },
      tooltip: { ...options.tooltip, theme: isDark ? 'dark' : 'light' }
    });

    this.memberDonutOptions = updateDonut(this.memberDonutOptions);
    this.gymSubDonutOptions = updateDonut(this.gymSubDonutOptions);
  }

  loadData() {
    this.loading.set(true);

    // Fetch both analytics and full gym list for deeper insights
    forkJoin({
      analytics: this.analyticsService.getRevenueAnalytics(),
      gyms: this.gymsService.getGyms()
    }).pipe(
      catchError(err => {
        this.error.set('Failed to load revenue analytics');
        return of(null);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe(res => {
      if (!res) return;

      const { analytics, gyms } = res;

      // KPI Updates
      this.mrr.set(analytics.mrr || 0);
      this.eliteRevenue.set(analytics.platform_upgrade_revenue || 0);
      const activeSub = gyms.length;
      this.activeSubscriptions.set(activeSub);
      this.arpu.set(activeSub > 0 ? (analytics.mrr || 0) / activeSub : 0);

      this.atRiskRevenue.set(analytics.at_risk_revenue || 0);
      this.churnedRevenue.set(analytics.churned_revenue || 0);
      this.expiringGyms.set(analytics.expiring_gyms || []);

      // Revenue Trend
      let growth = 0;
      if (analytics?.revenue_trend && analytics.revenue_trend.length >= 2) {
        const currentMonthRev = analytics.revenue_trend[analytics.revenue_trend.length - 1].revenue;
        const lastMonthRev = analytics.revenue_trend[analytics.revenue_trend.length - 2].revenue;
        if (lastMonthRev > 0) {
          growth = ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100;
          this.mrrGrowth.set(Math.round(growth));
          this.isHealthyGrowth.set(growth > 0);
        }
      }

      this.lineChartOptions.series = [{
        name: 'Revenue',
        data: analytics?.revenue_trend?.map(item => item.revenue) || [0, 0, 0, 0, 0, 0]
      }];
      this.lineChartOptions.xaxis = {
        ...this.lineChartOptions.xaxis,
        categories: analytics?.revenue_trend?.map(item => item.month) || []
      };

      // Member Distribution
      if (analytics.member_distribution) {
        this.memberDonutOptions.series = [
          analytics.member_distribution.standard,
          analytics.member_distribution.elite
        ];
        this.totalMembers.set(analytics.member_distribution.standard + analytics.member_distribution.elite);
      }

      // Gym Subscription Types breakdown
      const typeMap: Record<string, number> = { 'Monthly': 0, 'Semester': 0, 'Yearly': 0 };
      gyms.forEach(g => {
        let rawType = g.platform_subscription_type || 'monthly';
        rawType = rawType.toLowerCase();

        let type = 'Monthly';
        if (rawType === 'yearly' || rawType === 'year') type = 'Yearly';
        else if (rawType === 'semester' || rawType === 'semestrial') type = 'Semester';

        typeMap[type]++;
      });

      this.gymSubDonutOptions.series = Object.values(typeMap);
      this.gymSubDonutOptions.labels = Object.keys(typeMap);
      this.gymSubDonutOptions.plotOptions.pie.donut.labels.total.label = 'TOTAL NODES';

      this.generateInsights(growth, analytics.expiring_gyms || []);
    });
  }

  private generateInsights(growth: number, expiring: GymDto[]) {
    const insights = [];

    // Growth Insight
    if (growth >= 5) {
      insights.push({
        icon: 'trending_up',
        text: `Strong performance! Platform MRR grew by ${Math.round(growth)}% this month. Keep up the good work.`,
        type: 'positive'
      });
    } else if (growth < 0) {
      insights.push({
        icon: 'trending_down',
        text: `MRR decreased by ${Math.abs(Math.round(growth))}%. Consider reviewing retention strategies.`,
        type: 'warning'
      });
    }

    // Expiration Insight
    if (expiring.length > 0) {
      const expiredCount = expiring.filter(g => (g.days_remaining || 0) <= 0).length;
      if (expiredCount > 0) {
        insights.push({
          icon: 'report_problem',
          text: `Critical: ${expiredCount} facilities have expired subscriptions. Immediate action required.`,
          type: 'warning',
          action: 'Send Bulk Reminders',
          actionFn: () => this.bulkNotifyExpiring(expiring)
        });
      } else {
        insights.push({
          icon: 'schedule',
          text: `${expiring.length} facilities have subscriptions expiring in the next 7 days.`,
          type: 'neutral',
          action: 'View List',
          actionFn: () => {
            document.querySelector('.expiring-table-card')?.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    } else {
      insights.push({
        icon: 'verified',
        text: 'All managed facilities are currently active with healthy subscriptions.',
        type: 'positive'
      });
    }

    this.platformInsights.set(insights as any);
  }

  exportReport() {
    const data = [
      ['Metric', 'Value'],
      ['Total MRR', `${this.mrr()} TND`],
      ['Active Subscriptions', this.activeSubscriptions()],
      ['ARPU', `${this.arpu()} TND`],
      ['At Risk Revenue', `${this.atRiskRevenue()} TND`],
      ['Churned Revenue', `${this.churnedRevenue()} TND`]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `platform_revenue_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  bulkNotifyExpiring(expiring: GymDto[]) {
    // Notify all expired or urgent gyms
    expiring.filter(g => (g.days_remaining || 0) <= 3).forEach(gym => {
      this.notifyOwner(gym);
    });
  }

  notifyOwner(gym: GymDto) {
    if (!gym.id_owner) return;
    const message = `URGENT: Your platform subscription for ${gym.name} requires immediate attention. Please renew to ensure uninterrupted service.`;

    this.actionLoading.set(gym.id_gym + '_notify');
    this.gymsService.notifyOwner(gym.id_owner, message).subscribe({
      next: () => {
        this.actionLoading.set(null);
      },
      error: () => this.actionLoading.set(null)
    });
  }

  renewGym(gymId: string) {
    this.actionLoading.set(gymId);
    this.gymsService.renewGym(gymId).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.loadData();
      },
      error: () => this.actionLoading.set(null)
    });
  }

  trackByGymId(index: number, gym: GymDto) {
    return gym.id_gym;
  }
}
