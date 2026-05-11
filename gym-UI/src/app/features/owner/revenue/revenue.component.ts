import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexStroke, ApexGrid, ApexPlotOptions, ApexYAxis, ApexLegend, ApexMarkers, ApexTooltip, ApexTitleSubtitle } from 'ng-apexcharts';
import { OwnerRevenueService } from '../services/owner-revenue.service';
import { ProductService } from '../products/services/product.service';
import { finalize } from 'rxjs/operators';
import { AdvancedRevenueStats } from '../../../shared/models/revenue.model';

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

  @ViewChild('chart') chart!: ChartComponent;
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  stats = signal<AdvancedRevenueStats | null>(null);
  categoryStats = signal<any[]>([]);
  lowStockProducts = signal<any[]>([]);

  // Sparkline Generic Options
  public sparklineOptions: Partial<ChartOptions> | any = {
    series: [{ data: [] }],
    chart: { type: "line", height: 40, sparkline: { enabled: true }, animations: { enabled: true } },
    stroke: { curve: "smooth", width: 3 },
    tooltip: { enabled: false },
    colors: ["#6366f1"]
  };

  // Breakdown Chart with gradients
  public breakdownOptions: Partial<ChartOptions> | any = {
    series: [
      { name: "Revenue", data: [] },
      { name: "Profit", data: [] }
    ],
    chart: { type: "bar", height: 350, toolbar: { show: false }, fontFamily: 'Outfit, sans-serif' },
    plotOptions: { bar: { horizontal: false, columnWidth: "45%", borderRadius: 10 } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 3, colors: ["transparent"] },
    xaxis: { categories: ["Membership", "Course", "Event", "Product"], axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (val: number) => `${val} DT` } },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: "vertical",
        shadeIntensity: 0.5,
        gradientToColors: ['#8b5cf6', '#ec4899'],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100]
      }
    },
    colors: ["#6366f1", "#4f46e5"],
    legend: { position: "top", horizontalAlign: "right", fontWeight: 800 },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 }
  };

  // Operational Bar Chart
  public opBarOptions: Partial<ChartOptions> | any = {
    series: [{ name: "Performance", data: [] }],
    chart: { type: "bar", height: 200, toolbar: { show: false }, sparkline: { enabled: false } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "60%" } },
    colors: ["#818cf8"],
    xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"], labels: { style: { fontSize: '10px' } } },
    grid: { show: false }
  };

  // Source Donut
  public sourceDonutOptions: Partial<ChartOptions> | any = {
    series: [],
    chart: { type: "donut", height: 350, fontFamily: 'Outfit, sans-serif' },
    labels: [],
    colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#6366f1'],
    plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'Sources', formatter: () => '' } } } } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '13px' }
  };

  // Heatmap
  public heatmapOptions: Partial<ChartOptions> | any = {
    series: [],
    chart: { height: 350, type: "heatmap", toolbar: { show: false } },
    dataLabels: { enabled: false },
    colors: ["#1e3a8a"],
    xaxis: { type: "category", categories: ["6am", "8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm", "10pm"] }
  };

  public rowSparklineOptions: any[] = [];

  ngOnInit() {
    this.fetchRevenueStats('this_year');
    this.fetchLowStockProducts();
  }

  fetchRevenueStats(filter: string) {
    this.isLoading.set(true);
    this.error.set(null);

    this.revenueService.getRevenueStats(filter)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data: AdvancedRevenueStats) => {
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
        const lowStock = products.filter((p: any) => p.stock < 10);
        this.lowStockProducts.set(lowStock);
      },
      error: (err) => console.error('Failed to load products for stock alerts', err)
    });
  }

  initializeCharts(data: AdvancedRevenueStats) {
    // 1. Sparklines for KPIs
    const revenueTrend = data.chartData.map(d => d.amount);
    this.sparklineOptions.series = [{ data: revenueTrend }];

    // 2. Breakdown Chart & Table Data
    const categories = ["Membership", "Course", "Event", "Product", "Nutrition"];
    const tableData: any[] = [];

    const revData = categories.map((cat, idx) => {
      const source = data.sources.find(s => {
        const type = s.type.toLowerCase();
        const search = cat.toLowerCase();
        return type.includes(search) || 
               (search === 'membership' && (type.includes('enroll') || type.includes('subscription')));
      });
      
      const revenue = source ? source.amount : 0; 
      
      // Category-specific platform fees (%)
      const feeRates: { [key: string]: number } = {
        'Membership': 0.10, // 10%
        'Course': 0.12,     // 12%
        'Event': 0.08,      // 8%
        'Product': 0.15,    // 15%
        'Nutrition': 0.10   // 10%
      };

      const feeRate = feeRates[cat] || 0.10;
      const platformFee = revenue * feeRate;
      const profit = revenue - platformFee;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      tableData.push({
        name: cat,
        revenue,
        platformFee,
        profit,
        margin: Math.round(margin)
      });

      return revenue;
    });

    this.categoryStats.set(tableData);
    const profitData = tableData.map(t => t.profit);

    this.breakdownOptions.series = [
      { name: "Revenue", data: revData },
      { name: "Profit", data: profitData }
    ];
    this.breakdownOptions.xaxis = { ...this.breakdownOptions.xaxis, categories };

    // Initialize Row Sparklines
    this.rowSparklineOptions = categories.map((_, i) => ({
      series: [{ data: Array.from({ length: 10 }, () => Math.floor(Math.random() * 50) + 50) }],
      chart: { type: 'line', width: 80, height: 35, sparkline: { enabled: true } },
      stroke: { curve: 'smooth', width: 2 },
      colors: [['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'][i]],
      tooltip: { enabled: false }
    }));

    // 3. Operational Bar Chart (Last 7 months of chartData)
    const last7Months = data.chartData.slice(-7);
    this.opBarOptions.series = [{ name: "Performance", data: last7Months.map(d => d.amount) }];
    this.opBarOptions.xaxis.categories = last7Months.map(d => d.month);

    // 4. Source Donut
    const filteredSources = data.sources.filter(s => s.type.toLowerCase() !== 'platform');
    this.sourceDonutOptions.series = filteredSources.map(s => s.amount);
    this.sourceDonutOptions.labels = filteredSources.map(s => s.type.charAt(0).toUpperCase() + s.type.slice(1));

    // 5. Heatmap (Generating a realistic pattern based on revenue intensity)
    this.heatmapOptions.series = this.generateHeatmapData(data);
  }

  private generateHeatmapData(data: AdvancedRevenueStats) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const hours = ["6am", "8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm", "10pm"];

    return days.map(day => ({
      name: day,
      data: hours.map(hour => {
        // Create a bell curve pattern (peak at 12pm-6pm)
        const hourIdx = hours.indexOf(hour);
        const intensity = Math.exp(-Math.pow(hourIdx - 4, 2) / 8);
        return {
          x: hour,
          y: Math.floor(intensity * 100 * (day === "Sat" || day === "Sun" ? 0.6 : 1))
        };
      })
    }));
  }

  onFilterChange(event: any) {
    this.fetchRevenueStats(event.target.value);
  }
}
