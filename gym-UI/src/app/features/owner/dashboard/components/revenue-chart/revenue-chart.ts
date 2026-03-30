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
    series: [{ name: "Revenue", data: [] }],
    chart: { type: "bar", height: 320, toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    colors: ['#4f46e5'],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    xaxis: { categories: [], axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: '#64748b', fontSize: '13px', fontWeight: 600 } } },
    yaxis: { labels: { formatter: (val: number) => `$${val.toLocaleString()}`, style: { colors: '#64748b', fontSize: '12px' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: true } } }
  };

  ngOnInit() {
    this.fetchChartData('this_year');
  }

  fetchChartData(filter: string) {
    this.isLoadingChart.set(true);
    this.chartError.set(null);
    this.dashboardService.getRevenueChartData(filter)
      .pipe(finalize(() => this.isLoadingChart.set(false)))
      .subscribe({
        next: (data) => {
          this.chartOptions.series = [{ name: 'Revenue', data: data.map(d => d.amount) }];
          this.chartOptions.xaxis = { ...this.chartOptions.xaxis, categories: data.map(d => d.month) };
        },
        error: (err) => {
          console.error('Failed to load chart', err);
          this.chartError.set('Unable to load chart data');
        }
      });
  }

  onFilterChange(event: any) {
    this.fetchChartData(event.target.value);
  }
}
