import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';

import { DashboardFacade, DashboardVm } from '../data/dashboard.facade';

type ChartName = 'salesByDay' | 'topProducts' | 'stockEvolution' | 'mySales';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AsyncPipe, DatePipe, DecimalPipe, MatCardModule, MatIconModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(DashboardFacade);
  private readonly destroy$ = new Subject<void>();

  // Canevas présents selon la vue (magasin ou vendeur) : chacun peut être absent.
  @ViewChild('salesByDayCanvas') salesByDayCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsCanvas') topProductsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('stockEvolutionCanvas') stockEvolutionCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('mySalesCanvas') mySalesCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly charts = new Map<ChartName, Chart>();

  readonly vm$ = this.facade.vm$;

  constructor() {
    Chart.register(...registerables);
    this.facade.refresh();
  }

  ngAfterViewInit(): void {
    // Après le rendu du template : les canevas des blocs @if viennent d'apparaître.
    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => setTimeout(() => this.render(vm)));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.charts.forEach((chart) => chart.destroy());
    this.charts.clear();
  }

  private render(vm: DashboardVm): void {
    const days = vm.salesByDay;
    this.draw('salesByDay', this.salesByDayCanvas, 'line', 'Ventes', days.map((p) => p.date), days.map((p) => p.total), '#2563EB');
    this.draw('topProducts', this.topProductsCanvas, 'bar', 'CA', vm.topProducts.map((p) => p.name), vm.topProducts.map((p) => p.total), '#10B981');
    this.draw(
      'stockEvolution',
      this.stockEvolutionCanvas,
      'line',
      'Stock total',
      vm.stockEvolution.map((p) => p.label),
      vm.stockEvolution.map((p) => p.stockTotal),
      '#F59E0B'
    );
    const mine = vm.seller?.myDay?.last7Days ?? [];
    this.draw('mySales', this.mySalesCanvas, 'line', 'Mes ventes', mine.map((p) => p.label), mine.map((p) => p.total), '#2563EB');
  }

  /** Crée le graphique, le met à jour, ou le recrée si Angular a remplacé son canevas. */
  private draw(
    name: ChartName,
    canvas: ElementRef<HTMLCanvasElement> | undefined,
    type: 'line' | 'bar',
    label: string,
    labels: string[],
    data: number[],
    color: string
  ): void {
    const existing = this.charts.get(name);
    if (!canvas) {
      existing?.destroy();
      this.charts.delete(name);
      return;
    }
    if (existing && existing.canvas === canvas.nativeElement) {
      existing.data.labels = labels;
      existing.data.datasets[0].data = data;
      existing.update();
      return;
    }
    existing?.destroy();
    const chart =
      type === 'line'
        ? new Chart(canvas.nativeElement, lineConfig(label, labels, data, color))
        : new Chart(canvas.nativeElement, barConfig(label, labels, data, color));
    this.charts.set(name, chart as Chart);
  }
}

const tooltip = { backgroundColor: '#0F172A', cornerRadius: 6, padding: 10, titleFont: { size: 12 }, bodyFont: { size: 12 } };
const scales = {
  x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
  y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' }, ticks: { font: { size: 11 }, color: '#94A3B8' }, border: { display: false } }
};

function lineConfig(label: string, labels: string[], data: number[], color: string): ChartConfiguration<'line'> {
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: `${color}10`,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false }, tooltip },
      scales
    }
  };
}

function barConfig(label: string, labels: string[], data: number[], color: string): ChartConfiguration<'bar'> {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label, data, backgroundColor: color, borderRadius: 4, borderSkipped: false, maxBarThickness: 32 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip },
      scales
    }
  };
}
