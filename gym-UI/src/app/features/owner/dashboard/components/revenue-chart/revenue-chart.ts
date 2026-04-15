import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexStroke, ApexGrid, ApexPlotOptions, ApexYAxis } from 'ng-apexcharts';
import { OwnerDashboardService } from '../../../services/owner-dashboard.service';
import { finalize } from 'rxjs/operators';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  colors: string[];
  grid: ApexGrid;
};

@Component({
  selector: 'app-revenue-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './revenue-chart.html',
  styleUrl: './revenue-chart.scss'
})
export class RevenueChartComponent implements OnInit {
  private dashboardService = inject(OwnerDashboardService);

  @ViewChild('chart') chart!: ChartComponent;
  isLoadingChart = signal<boolean>(true);
  chartError = signal<string | null>(null);

  public chartOptions: Partial<ChartOptions> | any = {
    series: [
      { name: "Attendance", data: [] },
      { name: "New Sign-ups", data: [] },
      { name: "Cancellations", data: [] }
    ],
    chart: { type: "area", height: 320, toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true }, sparkline: { enabled: false } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    colors: ['#0ea5e9', '#f59e0b', '#f43f5e'],
    dataLabels: { enabled: false },
    stroke: { width: 3, curve: 'smooth' },
    xaxis: { categories: [], axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 } } },
    yaxis: { labels: { formatter: (val: number) => Math.round(val), style: { colors: '#64748b', fontSize: '12px' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: true } } }
  };

  ngOnInit() {
    this.fetchChartData();
  }

  fetchChartData() {
    this.isLoadingChart.set(true);
    this.chartError.set(null);
    this.dashboardService.getActivityChartData()
      .pipe(finalize(() => this.isLoadingChart.set(false)))
      .subscribe({
        next: (data) => {
          this.chartOptions.series = [
            { name: 'Attendance', data: data.map(d => d.attendance) },
            { name: 'New Sign-ups', data: data.map(d => d.signups) },
            { name: 'Cancellations', data: data.map(d => d.cancellations) }
          ];
          this.chartOptions.xaxis = { ...this.chartOptions.xaxis, categories: data.map(d => d.date) };
        },
        error: (err) => {
          console.error('Failed to load chart', err);
          this.chartError.set('Unable to load chart data');
        }
      });
  }

}
