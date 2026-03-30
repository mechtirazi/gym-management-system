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
import { catchError, finalize, of } from 'rxjs';

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
  activeSubscriptions = signal(0);
  arpu = signal(0);
  mrrGrowth = signal(0);
  isHealthyGrowth = signal(true);
  
  atRiskRevenue = signal(0);
  churnedRevenue = signal(0);
  expiringGyms = signal<GymDto[]>([]);
  
  actionLoading = signal<string | null>(null);

  public lineChartOptions: Partial<LineChartOptions> | any;
  public donutChartOptions: Partial<DonutChartOptions> | any;

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
      stroke: { curve: "smooth", width: 3, colors: ['#818cf8'] }, 
      colors: ['#818cf8'],
      fill: {
        type: "gradient",
        gradient: {
          shade: 'dark',
          type: "vertical",
          shadeIntensity: 1,
          opacityFrom: 0.5,
          opacityTo: 0,
          stops: [0, 100]
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
        labels: { style: { colors: '#64748b', fontSize: '10px', fontWeight: 700 } }
      },
      yaxis: {
        labels: {
          style: { colors: '#64748b', fontSize: '10px', fontWeight: 700 },
          formatter: (val: number) => `$${Math.round(val/1000)}k`
        }
      },
      tooltip: { 
        theme: 'dark',
        x: { show: true },
        marker: { show: true }
      }
    };

    this.donutChartOptions = {
      series: [0, 0],
      chart: {
        type: "donut",
        height: 280,
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'transparent'
      },
      labels: ["Basic", "Pro"],
      colors: ['#10b981', '#c026d3'],
      stroke: { show: true, width: 2, colors: ['rgba(0,0,0,0)'] },
      plotOptions: {
        pie: {
          donut: {
            size: '80%',
            labels: {
              show: true,
              name: { show: true, fontSize: '12px', fontWeight: 700, color: '#94a3b8', offsetY: -10 },
              value: { 
                show: true, 
                fontSize: '24px', 
                fontWeight: 900, 
                color: '#ffffff', 
                offsetY: 10,
                formatter: (val: string) => val 
              },
              total: {
                show: true,
                label: 'TOTAL NODES',
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

    this.donutChartOptions = {
      ...this.donutChartOptions,
      plotOptions: {
        ...this.donutChartOptions.plotOptions,
        pie: {
          ...this.donutChartOptions.plotOptions.pie,
          donut: {
            ...this.donutChartOptions.plotOptions.pie.donut,
            labels: {
              ...this.donutChartOptions.plotOptions.pie.donut.labels,
              name: { ...this.donutChartOptions.plotOptions.pie.donut.labels.name, color: labelColor },
              value: { ...this.donutChartOptions.plotOptions.pie.donut.labels.value, color: valueColor }
            }
          }
        }
      },
      tooltip: { ...this.donutChartOptions.tooltip, theme: isDark ? 'dark' : 'light' }
    };
  }

  loadData() {
    this.loading.set(true);
    this.analyticsService.getRevenueAnalytics().pipe(
      catchError(err => {
        this.error.set('Failed to load revenue analytics');
        return of(null);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe(data => {
      if (data) {
        this.mrr.set(data.mrr || 0);
        const activeSub = (data?.basic_gyms_count || 0) + (data?.pro_gyms_count || 0);
        this.activeSubscriptions.set(activeSub);
        this.arpu.set(activeSub > 0 ? (data.mrr || 0) / activeSub : 0);
        
        this.atRiskRevenue.set(data.at_risk_revenue || 0);
        this.churnedRevenue.set(data.churned_revenue || 0);
        this.expiringGyms.set(data.expiring_gyms || []);

        if (data?.revenue_trend && data.revenue_trend.length >= 2) {
          const currentMonthRev = data.revenue_trend[data.revenue_trend.length - 1].revenue;
          const lastMonthRev = data.revenue_trend[data.revenue_trend.length - 2].revenue;
          if (lastMonthRev > 0) {
            const growth = ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100;
            this.mrrGrowth.set(Math.round(growth));
            this.isHealthyGrowth.set(growth > 0);
          } else if (currentMonthRev > 0) {
            this.mrrGrowth.set(100);
            this.isHealthyGrowth.set(true);
          } else {
            this.mrrGrowth.set(0);
            this.isHealthyGrowth.set(true);
          }
        }

        // Update Line Chart
        this.lineChartOptions.series = [{
          name: 'Revenue',
          data: data?.revenue_trend?.map(item => item.revenue) || [0, 0, 0, 0, 0, 0]
        }];
        this.lineChartOptions.xaxis = {
          ...this.lineChartOptions.xaxis,
          categories: data?.revenue_trend?.map(item => item.month) || ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
        };

        // Update Donut Chart
        this.donutChartOptions.series = [
          data?.basic_gyms_count || 0,
          data?.pro_gyms_count || 0
        ];
      }
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
