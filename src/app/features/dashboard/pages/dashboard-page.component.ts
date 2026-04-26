import { AsyncPipe, DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';

import { DashboardFacade } from '../data/dashboard.facade';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, MatCardModule],
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
            borderColor: '#3f51b5',
            backgroundColor: 'rgba(63, 81, 181, 0.15)',
            fill: true,
            tension: 0.35,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true }
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
            backgroundColor: 'rgba(76, 175, 80, 0.6)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
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
            borderColor: '#ff9800',
            backgroundColor: 'rgba(255, 152, 0, 0.15)',
            fill: true,
            tension: 0.35,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
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
