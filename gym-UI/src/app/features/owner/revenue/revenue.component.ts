import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexStroke, ApexGrid, ApexPlotOptions, ApexYAxis, ApexLegend } from 'ng-apexcharts';
import { OwnerRevenueService } from '../services/owner-revenue.service';
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

  @ViewChild('chart') chart!: ChartComponent;
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  stats = signal<AdvancedRevenueStats | null>(null);

  public barChartOptions: Partial<ChartOptions> | any = {
    series: [
      { name: "Revenue", type: 'column', data: [] },
      { name: "Total Members", type: 'line', data: [] }
    ],
    chart: {
      type: "line",
      height: 400,
      stacked: false,
      toolbar: { show: false },
      fontFamily: 'Outfit, sans-serif',
      zoom: { enabled: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 12,
        columnWidth: '35%',
        dataLabels: { position: 'top' }
      }
    },
    colors: ['rgba(99, 102, 241, 0.8)', '#10b981'],
    dataLabels: {
      enabled: true,
      enabledOnSeries: [1],
      style: { fontSize: '10px', colors: ['#10b981'] },
      background: { enabled: true, padding: 4, borderRadius: 4, borderWidth: 0, opacity: 0.9 }
    },
    stroke: {
      width: [0, 4],
      curve: 'smooth',
      dashArray: [0, 0]
    },
    xaxis: {
      categories: [],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#94a3b8', fontSize: '13px' } }
    },
    yaxis: [
      {
        axisTicks: { show: false },
        axisBorder: { show: false },
        labels: {
          formatter: (val: number) => `${Math.round(val).toLocaleString()} DT`,
          style: { colors: '#6366f1', fontSize: '12px', fontWeight: 600 }
        },
        title: { text: "Revenue", style: { color: '#6366f1', fontWeight: 700 } }
      },
      {
        opposite: true,
        axisTicks: { show: false },
        axisBorder: { show: false },
        labels: {
          formatter: (val: number) => `${Math.round(val)}`,
          style: { colors: '#10b981', fontSize: '12px', fontWeight: 600 }
        },
        title: { text: "Members", style: { color: '#10b981', fontWeight: 700 } }
      }
    ],
    markers: { size: 5, strokeColors: '#fff', strokeWidth: 3, hover: { size: 7 } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend: { position: 'top', horizontalAlign: 'right', fontWeight: 600, markers: { radius: 12 } }
  };

  public sourceDonutOptions: Partial<ChartOptions> | any = {
    series: [],
    chart: { type: "donut", height: 320, fontFamily: 'Outfit, sans-serif' },
    labels: [],
    colors: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#64748b'],
    plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'Sources', formatter: () => '' } } } } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '13px' }
  };

  public methodDonutOptions: Partial<ChartOptions> | any = {
    series: [],
    chart: { type: "donut", height: 320, fontFamily: 'Outfit, sans-serif' },
    labels: [],
    colors: ['#3b82f6', '#8b5cf6', '#14b8a6'],
    plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'Methods', formatter: () => '' } } } } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '13px' }
  };

  ngOnInit() {
    this.fetchRevenueStats('this_year');
  }

  fetchRevenueStats(filter: string) {
    this.isLoading.set(true);
    this.error.set(null);

    this.revenueService.getRevenueStats(filter)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data: AdvancedRevenueStats) => {
          this.stats.set(data);

          // Update Mixed Chart (Revenue + Member Growth)
          this.barChartOptions.series = [
            { name: 'Revenue', type: 'column', data: data.chartData.map((d: any) => d.amount) },
            { name: 'Total Members', type: 'line', data: data.memberGrowth.map((d: any) => d.count) }
          ];
          this.barChartOptions.xaxis = { ...this.barChartOptions.xaxis, categories: data.chartData.map((d: any) => d.month) };

          // Update Sources donut
          if (data.sources) {
            this.sourceDonutOptions.series = data.sources.map((s: any) => s.amount);
            this.sourceDonutOptions.labels = data.sources.map((s: any) => s.type.charAt(0).toUpperCase() + s.type.slice(1));
          }

          // Update Methods donut
          if (data.methods) {
            this.methodDonutOptions.series = data.methods.map((m: any) => m.amount);
            this.methodDonutOptions.labels = data.methods.map((m: any) => m.method.charAt(0).toUpperCase() + m.method.slice(1));
          }
        },
        error: (err) => {
          console.error('Failed to load revenue stats', err);
          this.error.set('Unable to load analytical data. Please try again.');
        }
      });
  }

  onFilterChange(event: any) {
    this.fetchRevenueStats(event.target.value);
  }
}
