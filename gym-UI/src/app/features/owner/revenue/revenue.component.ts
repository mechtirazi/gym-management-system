import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexGrid,
  ApexPlotOptions,
  ApexYAxis,
  ApexLegend,
  ApexMarkers,
  ApexTooltip,
  ApexTitleSubtitle
} from 'ng-apexcharts';
import { finalize } from 'rxjs/operators';
import { OwnerRevenueService } from '../services/owner-revenue.service';
import { ProductService } from '../products/services/product.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AdvancedRevenueStats } from '../../../shared/models/revenue.model';

type RevenueFilter = 'this_year' | 'last_6_months';

export type ChartOptions = {
  series: ApexAxisChartSeries | any;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  colors: string[];
  grid: ApexGrid;
  labels: string[];
  legend: ApexLegend;
  markers: ApexMarkers;
  tooltip: ApexTooltip;
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-owner-revenue',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './revenue.component.html',
  styleUrl: './revenue.component.scss'
})
export class OwnerRevenueComponent implements OnInit {
  private revenueService = inject(OwnerRevenueService);
  private productService = inject(ProductService);
  private themeService = inject(ThemeService);

  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  stats = signal<AdvancedRevenueStats | null>(null);
  categoryStats = signal<any[]>([]);
  lowStockProducts = signal<any[]>([]);
  selectedFilter = signal<RevenueFilter>('this_year');
  isDarkMode = this.themeService.darkMode;

  private latestRevenueData: AdvancedRevenueStats | null = null;
  private readonly heatmapTimeSlots = ['12am', '2am', '4am', '6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm', '10pm'];

  netMarginPercent = computed(() => {
    const currentStats = this.stats();
    if (!currentStats) {
      return 0;
    }

    const totalRevenue = this.toNumber(currentStats.totalRevenue);
    if (totalRevenue <= 0) {
      return 0;
    }

    const platformRevenue = (currentStats.sources || [])
      .filter((source) => this.normalizeRevenueCategory(source.type) === 'Platform')
      .reduce((sum, source) => sum + this.toNumber(source.amount), 0);

    const netRevenue = Math.max(totalRevenue - platformRevenue, 0);
    return this.clamp((netRevenue / totalRevenue) * 100, 0, 100);
  });

  monthlyGoalPercent = computed(() => {
    const currentStats = this.stats();
    if (!currentStats) {
      return 0;
    }

    const currentRevenue = this.toNumber(currentStats.totalRevenue);
    const monthlyGoalTarget = this.toNumber(currentStats.growth?.forecast);
    if (monthlyGoalTarget <= 0) {
      return 0;
    }

    return this.clamp((currentRevenue / monthlyGoalTarget) * 100, 0, 100);
  });

  public sparklineOptions: Partial<ChartOptions> | any = {};
  public breakdownOptions: Partial<ChartOptions> | any = {};
  public opBarOptions: Partial<ChartOptions> | any = {};
  public sourceDonutOptions: Partial<ChartOptions> | any = {};
  public heatmapOptions: Partial<ChartOptions> | any = {};
  public rowSparklineOptions: any[] = [];

  constructor() {
    this.initializeChartOptions();

    effect(() => {
      this.themeService.darkMode();
      this.applyThemeToCharts();
    });
  }

  ngOnInit() {
    this.fetchRevenueStats(this.selectedFilter());
    this.fetchLowStockProducts();
  }

  fetchRevenueStats(filter: RevenueFilter) {
    this.selectedFilter.set(filter);
    this.isLoading.set(true);
    this.error.set(null);

    this.revenueService.getRevenueStats(filter)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data: AdvancedRevenueStats) => {
          this.latestRevenueData = data;
          this.stats.set(data);
          this.initializeCharts(data);
        },
        error: (err) => {
          console.error('Failed to load revenue stats', err);
          this.error.set('Unable to load analytical data. Please try again.');
        }
      });
  }

  fetchLowStockProducts() {
    this.productService.getProducts().subscribe({
      next: (res: any) => {
        const products = res.data || [];
        const lowStock = products.filter((product: any) => this.toNumber(product.stock) < 10);
        this.lowStockProducts.set(lowStock);
      },
      error: (err) => console.error('Failed to load products for stock alerts', err)
    });
  }

  toggleTheme() {
    this.themeService.toggleDarkMode();
  }

  onFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as RevenueFilter;
    this.fetchRevenueStats(value);
  }

  private initializeChartOptions() {
    this.sparklineOptions = {
      series: [{ data: [] }],
      chart: {
        type: 'line',
        height: 52,
        sparkline: { enabled: true },
        toolbar: { show: false },
        animations: { enabled: true, speed: 650, easing: 'easeinout' }
      },
      stroke: { curve: 'smooth', width: 3 },
      tooltip: { enabled: false },
      colors: ['#0ea5e9']
    };

    this.breakdownOptions = {
      series: [{ name: 'Revenue', data: [] }],
      chart: {
        type: 'bar',
        height: 340,
        toolbar: { show: false },
        fontFamily: 'Sora, Inter, sans-serif',
        background: 'transparent'
      },
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 12,
          columnWidth: '52%'
        }
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        categories: [],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { fontSize: '11px', fontWeight: 600 } }
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', fontWeight: 600 },
          formatter: (value: number) => `${value.toLocaleString()} DT`
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.35,
          gradientToColors: ['#0f766e'],
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.88,
          stops: [0, 100]
        }
      },
      colors: ['#0891b2'],
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
      legend: { show: false },
      tooltip: { theme: 'light' }
    };

    this.opBarOptions = {
      series: [{ name: 'Performance', data: [] }],
      chart: {
        type: 'bar',
        height: 210,
        toolbar: { show: false },
        fontFamily: 'Sora, Inter, sans-serif',
        background: 'transparent'
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '56%'
        }
      },
      dataLabels: { enabled: false },
      colors: ['#06b6d4'],
      xaxis: {
        categories: [],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { fontSize: '10px', fontWeight: 600 } }
      },
      yaxis: {
        labels: {
          style: { fontSize: '10px', fontWeight: 600 },
          formatter: (value: number) => `${Math.round(value / 1000)}k`
        }
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 3
      },
      tooltip: { theme: 'light' }
    };

    this.sourceDonutOptions = {
      series: [],
      chart: {
        type: 'donut',
        height: 340,
        fontFamily: 'Sora, Inter, sans-serif',
        background: 'transparent'
      },
      labels: [],
      colors: ['#06b6d4', '#f59e0b', '#10b981', '#f97316', '#6366f1'],
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: {
                show: true,
                offsetY: -6,
                fontSize: '12px',
                fontWeight: 700,
                color: '#64748b'
              },
              value: {
                show: true,
                offsetY: 8,
                fontSize: '20px',
                fontWeight: 800,
                color: '#0f172a'
              },
              total: {
                show: true,
                label: 'Total',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((sum: number, value: number) => sum + value, 0);
                  return `${Math.round(total).toLocaleString()} DT`;
                }
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: {
        position: 'bottom',
        fontSize: '12px',
        fontWeight: 600
      },
      tooltip: { theme: 'light' }
    };

    this.heatmapOptions = {
      series: [],
      chart: {
        type: 'heatmap',
        height: 320,
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif',
        background: 'transparent',
        foreColor: '#475569'
      },
      dataLabels: { enabled: false },
      colors: ['#0ea5e9'],
      plotOptions: {
        heatmap: {
          shadeIntensity: 0.65,
          radius: 4,
          useFillColorAsStroke: false,
          colorScale: {
            ranges: [
              { from: 0, to: 0, color: '#f1f5f9', name: 'None' }
            ]
          }
        }
      },
      xaxis: {
        type: 'category',
        categories: this.heatmapTimeSlots,
        labels: { style: { fontSize: '11px', fontWeight: 600 } }
      },
      yaxis: {
        labels: { style: { fontSize: '11px', fontWeight: 600 } }
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val: number) => `${val} transaction${val !== 1 ? 's' : ''}`
        }
      }
    };

    this.applyThemeToCharts();
  }

  initializeCharts(data: AdvancedRevenueStats) {
    const revenueTrend = data.chartData.map((point) => this.toNumber(point.amount));
    this.sparklineOptions = {
      ...this.sparklineOptions,
      series: [{ data: revenueTrend }]
    };

    const categoryRevenueMap = new Map<string, number>();
    const totalRevenue = this.toNumber(data.totalRevenue);

    for (const source of data.sources || []) {
      const category = this.normalizeRevenueCategory(source.type);
      if (category === 'Platform') {
        continue;
      }

      const amount = this.toNumber(source.amount);
      if (amount <= 0) {
        continue;
      }

      categoryRevenueMap.set(category, (categoryRevenueMap.get(category) || 0) + amount);
    }

    const categories = Array.from(categoryRevenueMap.keys());
    const tableData: any[] = categories.map((name) => {
      const revenue = this.toNumber(categoryRevenueMap.get(name));
      const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

      return {
        name,
        revenue,
        netRevenue: revenue,
        share: Math.round(share)
      };
    });

    this.categoryStats.set(tableData);

    const revenuePerCategory = tableData.map((row) => row.revenue);
    this.breakdownOptions = {
      ...this.breakdownOptions,
      series: [{ name: 'Revenue', data: revenuePerCategory.length > 0 ? revenuePerCategory : [0] }],
      xaxis: {
        ...this.breakdownOptions.xaxis,
        categories: revenuePerCategory.length > 0 ? categories : ['No revenue']
      }
    };

    const sparklinePalette = this.getSparklinePalette();
    this.rowSparklineOptions = tableData.map((row, index) => ({
      series: [{ data: this.buildRealTrendSeries(data.categoryTrends?.[row.name], row.revenue) }],
      chart: {
        type: 'line',
        width: 94,
        height: 36,
        sparkline: { enabled: true },
        animations: { enabled: true, speed: 600 }
      },
      stroke: { curve: 'smooth', width: 2.4 },
      colors: [sparklinePalette[index % sparklinePalette.length]],
      tooltip: { enabled: false }
    }));

    const last7Months = data.chartData.slice(-7);
    this.opBarOptions = {
      ...this.opBarOptions,
      series: [{ name: 'Performance', data: last7Months.map((point) => this.toNumber(point.amount)) }],
      xaxis: {
        ...this.opBarOptions.xaxis,
        categories: last7Months.map((point) => point.month)
      }
    };

    const donutMap = new Map<string, number>();
    for (const source of data.sources || []) {
      const category = this.normalizeRevenueCategory(source.type);
      if (category === 'Platform') {
        continue;
      }

      const amount = this.toNumber(source.amount);
      if (amount <= 0) {
        continue;
      }

      donutMap.set(category, (donutMap.get(category) || 0) + amount);
    }

    this.sourceDonutOptions = {
      ...this.sourceDonutOptions,
      series: Array.from(donutMap.values()),
      labels: Array.from(donutMap.keys())
    };

    this.heatmapOptions = {
      ...this.heatmapOptions,
      series: this.buildHeatmapFromApi(data)
    };

    this.applyThemeToCharts();
  }

  private applyThemeToCharts() {
    const isDark = this.isDarkMode();
    const axisLabelColor = isDark ? '#94a3b8' : '#475569';
    const valueLabelColor = isDark ? '#f8fafc' : '#0f172a';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(148, 163, 184, 0.32)';
    const tooltipTheme = isDark ? 'dark' : 'light';

    this.sparklineOptions = {
      ...this.sparklineOptions,
      colors: [isDark ? '#22d3ee' : '#0284c7']
    };

    this.breakdownOptions = {
      ...this.breakdownOptions,
      colors: [isDark ? '#22d3ee' : '#0891b2'],
      fill: {
        ...this.breakdownOptions.fill,
        gradient: {
          ...this.breakdownOptions.fill?.gradient,
          shade: isDark ? 'dark' : 'light',
          gradientToColors: [isDark ? '#0e7490' : '#0f766e']
        }
      },
      grid: {
        ...this.breakdownOptions.grid,
        borderColor: gridColor
      },
      xaxis: {
        ...this.breakdownOptions.xaxis,
        labels: {
          ...this.breakdownOptions.xaxis?.labels,
          style: {
            ...this.breakdownOptions.xaxis?.labels?.style,
            colors: axisLabelColor
          }
        }
      },
      yaxis: {
        ...this.breakdownOptions.yaxis,
        labels: {
          ...this.breakdownOptions.yaxis?.labels,
          style: {
            ...this.breakdownOptions.yaxis?.labels?.style,
            colors: axisLabelColor
          }
        }
      },
      tooltip: {
        ...this.breakdownOptions.tooltip,
        theme: tooltipTheme
      }
    };

    this.opBarOptions = {
      ...this.opBarOptions,
      colors: [isDark ? '#22d3ee' : '#06b6d4'],
      grid: {
        ...this.opBarOptions.grid,
        borderColor: gridColor
      },
      xaxis: {
        ...this.opBarOptions.xaxis,
        labels: {
          ...this.opBarOptions.xaxis?.labels,
          style: {
            ...this.opBarOptions.xaxis?.labels?.style,
            colors: axisLabelColor
          }
        }
      },
      yaxis: {
        ...this.opBarOptions.yaxis,
        labels: {
          ...this.opBarOptions.yaxis?.labels,
          style: {
            ...this.opBarOptions.yaxis?.labels?.style,
            colors: axisLabelColor
          }
        }
      },
      tooltip: {
        ...this.opBarOptions.tooltip,
        theme: tooltipTheme
      }
    };

    this.sourceDonutOptions = {
      ...this.sourceDonutOptions,
      legend: {
        ...this.sourceDonutOptions.legend,
        labels: {
          colors: axisLabelColor
        }
      },
      plotOptions: {
        ...this.sourceDonutOptions.plotOptions,
        pie: {
          ...this.sourceDonutOptions.plotOptions?.pie,
          donut: {
            ...this.sourceDonutOptions.plotOptions?.pie?.donut,
            labels: {
              ...this.sourceDonutOptions.plotOptions?.pie?.donut?.labels,
              name: {
                ...this.sourceDonutOptions.plotOptions?.pie?.donut?.labels?.name,
                color: axisLabelColor
              },
              value: {
                ...this.sourceDonutOptions.plotOptions?.pie?.donut?.labels?.value,
                color: valueLabelColor
              },
              total: {
                ...this.sourceDonutOptions.plotOptions?.pie?.donut?.labels?.total,
                color: axisLabelColor
              }
            }
          }
        }
      },
      tooltip: {
        ...this.sourceDonutOptions.tooltip,
        theme: tooltipTheme
      }
    };

    // Dark mode empty-cell color for heatmap
    const heatmapEmptyColor = isDark ? '#1e293b' : '#f1f5f9';

    this.heatmapOptions = {
      ...this.heatmapOptions,
      chart: {
        ...this.heatmapOptions.chart,
        background: 'transparent',
        foreColor: axisLabelColor
      },
      plotOptions: {
        heatmap: {
          shadeIntensity: 0.65,
          radius: 4,
          useFillColorAsStroke: false,
          colorScale: {
            ranges: [
              { from: 0, to: 0, color: heatmapEmptyColor, name: 'None' }
            ]
          }
        }
      },
      colors: [isDark ? '#22d3ee' : '#0891b2'],
      xaxis: {
        ...this.heatmapOptions.xaxis,
        labels: {
          ...this.heatmapOptions.xaxis?.labels,
          style: {
            ...this.heatmapOptions.xaxis?.labels?.style,
            colors: axisLabelColor
          }
        }
      },
      yaxis: {
        ...this.heatmapOptions.yaxis,
        labels: {
          ...this.heatmapOptions.yaxis?.labels,
          style: {
            ...this.heatmapOptions.yaxis?.labels?.style,
            colors: axisLabelColor
          }
        }
      },
      tooltip: {
        ...this.heatmapOptions.tooltip,
        theme: tooltipTheme
      }
    };

    if (this.rowSparklineOptions.length > 0) {
      const palette = this.getSparklinePalette();
      this.rowSparklineOptions = this.rowSparklineOptions.map((row, index) => ({
        ...row,
        colors: [palette[index % palette.length]]
      }));
    }

    if (this.latestRevenueData) {
      const last7Months = this.latestRevenueData.chartData.slice(-7);
      this.opBarOptions = {
        ...this.opBarOptions,
        xaxis: {
          ...this.opBarOptions.xaxis,
          categories: last7Months.map((point) => point.month)
        }
      };
    }
  }

  /**
   * Converts the raw paymentHeatmap payload from the API into ApexCharts
   * heatmap series format.  Falls back to an empty array if the API returns
   * no data so the chart renders without crashing.
   */
  private buildHeatmapFromApi(data: AdvancedRevenueStats): any[] {
    const raw = data.paymentHeatmap;
    if (!raw || raw.length === 0) {
      return [];
    }
    // The backend already returns the correct shape:
    // [{ name: 'Mon', data: [{ x: '6am', y: 3 }, ...] }, ...]
    return raw.map(series => ({
      name: series.name,
      data: series.data.map(slot => ({ x: slot.x, y: slot.y }))
    }));
  }

  private normalizeRevenueCategory(type: string): string {
    const value = (type || '').toLowerCase().trim();

    if (value.includes('platform')) return 'Platform';
    if (value.includes('membership') || value.includes('enroll') || value.includes('subscription')) return 'Membership';
    if (value.includes('course')) return 'Course';
    if (value.includes('event')) return 'Event';
    if (value.includes('product') || value.includes('order')) return 'Product';
    if (value.includes('nutrition')) return 'Nutrition';

    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Other';
  }

  private buildRealTrendSeries(series: unknown, fallbackValue: number): number[] {
    if (Array.isArray(series)) {
      const values = series
        .map((point) => this.toNumber(point))
        .filter((point) => point >= 0);

      if (values.length > 0 && values.some((point) => point > 0)) {
        return values;
      }
    }

    const fallback = this.toNumber(fallbackValue);
    return [Math.max(fallback, 0)];
  }

  private getSparklinePalette(): string[] {
    return this.isDarkMode()
      ? ['#22d3ee', '#38bdf8', '#f59e0b', '#10b981', '#f97316']
      : ['#0284c7', '#0ea5e9', '#f59e0b', '#0f766e', '#f97316'];
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
