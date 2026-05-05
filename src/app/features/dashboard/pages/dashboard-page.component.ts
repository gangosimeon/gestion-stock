import { AsyncPipe, DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';

import { DashboardFacade } from '../data/dashboard.facade';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, MatCardModule, MatIconModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(DashboardFacade);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('salesByDayCanvas') salesByDayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsCanvas') topProductsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stockEvolutionCanvas') stockEvolutionCanvas!: ElementRef<HTMLCanvasElement>;

  private salesByDayChart: Chart | null = null;
  private topProductsChart: Chart | null = null;
  private stockEvolutionChart: Chart | null = null;

  readonly vm$ = this.facade.vm$;

  constructor() {
    Chart.register(...registerables);
    this.facade.refresh();
  }

  ngAfterViewInit(): void {
    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.renderSalesByDay(vm.salesByDay);
      this.renderTopProducts(vm.topProducts);
      this.renderStockEvolution(vm.stockEvolution);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.salesByDayChart?.destroy();
    this.topProductsChart?.destroy();
    this.stockEvolutionChart?.destroy();
  }

  private renderSalesByDay(points: { date: string; total: number; profit: number }[]): void {
    const labels = points.map((p) => p.date);
    const data = points.map((p) => p.total);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ventes',
            data,
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.06)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#2563EB'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#0F172A', cornerRadius: 6, padding: 10, titleFont: { size: 12 }, bodyFont: { size: 12 } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
          y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' }, ticks: { font: { size: 11 }, color: '#94A3B8' }, border: { display: false } }
        }
      }
    };

    if (!this.salesByDayChart) {
      this.salesByDayChart = new Chart(this.salesByDayCanvas.nativeElement, config);
      return;
    }

    this.salesByDayChart.data.labels = labels;
    this.salesByDayChart.data.datasets[0].data = data;
    this.salesByDayChart.update();
  }

  private renderTopProducts(points: { name: string; total: number }[]): void {
    const labels = points.map((p) => p.name);
    const data = points.map((p) => p.total);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'CA',
            data,
            backgroundColor: '#10B981',
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 32
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#0F172A', cornerRadius: 6, padding: 10 }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
          y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' }, ticks: { font: { size: 11 }, color: '#94A3B8' }, border: { display: false } }
        }
      }
    };

    if (!this.topProductsChart) {
      this.topProductsChart = new Chart(this.topProductsCanvas.nativeElement, config);
      return;
    }

    this.topProductsChart.data.labels = labels;
    this.topProductsChart.data.datasets[0].data = data;
    this.topProductsChart.update();
  }

  private renderStockEvolution(points: { label: string; stockTotal: number }[]): void {
    const labels = points.map((p) => p.label);
    const data = points.map((p) => p.stockTotal);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Stock total',
            data,
            borderColor: '#F59E0B',
            backgroundColor: 'rgba(245, 158, 11, 0.06)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#F59E0B'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#0F172A', cornerRadius: 6, padding: 10 }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
          y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' }, ticks: { font: { size: 11 }, color: '#94A3B8' }, border: { display: false } }
        }
      }
    };

    if (!this.stockEvolutionChart) {
      this.stockEvolutionChart = new Chart(this.stockEvolutionCanvas.nativeElement, config);
      return;
    }

    this.stockEvolutionChart.data.labels = labels;
    this.stockEvolutionChart.data.datasets[0].data = data;
    this.stockEvolutionChart.update();
  }
}
