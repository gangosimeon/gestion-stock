import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../auth/services/auth.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { DashboardFacade, DashboardVm } from '../data/dashboard.facade';

type ChartName = 'salesByDay' | 'topProducts' | 'stockEvolution' | 'mySales';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AsyncPipe, DatePipe, DecimalPipe, MatCardModule, MatCheckboxModule, MatIconModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(DashboardFacade);
  private readonly warehouseCtx = inject(WarehouseContextService);
  private readonly destroy$ = new Subject<void>();

  // Canevas présents selon la vue (magasin ou vendeur) : chacun peut être absent.
  @ViewChild('salesByDayCanvas') salesByDayCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsCanvas') topProductsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('stockEvolutionCanvas') stockEvolutionCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('mySalesCanvas') mySalesCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly charts = new Map<ChartName, Chart>();

  readonly vm$ = this.facade.vm$;
  /** Dépôt courant (sélecteur de l'en-tête), rappelé sous le titre. */
  readonly warehouse$ = this.warehouseCtx.warehouse$;
  /** Vue fusionnée de tous les dépôts : interface seulement, le serveur exige warehouse:all. */
  readonly canSeeAllWarehouses = inject(AuthService).hasPermission('warehouse:all');

  setAllWarehouses(allWarehouses: boolean): void {
    this.facade.setAllWarehouses(allWarehouses);
  }

  constructor() {
    Chart.register(...registerables);
    // Typographie de l'application dans les graphiques.
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    Chart.defaults.color = CHART.text;
    this.facade.refresh();
    // Autre magasin : chiffres rechargés (la facade a déjà effacé ceux du précédent).
    this.warehouseCtx.warehouseChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => this.facade.refresh());
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
    this.draw('salesByDay', this.salesByDayCanvas, 'line', 'Ventes', days.map((p) => p.date), days.map((p) => p.total), CHART.blue);
    this.draw('topProducts', this.topProductsCanvas, 'bar', 'CA', vm.topProducts.map((p) => p.name), vm.topProducts.map((p) => p.total), CHART.lightBlue);
    this.draw(
      'stockEvolution',
      this.stockEvolutionCanvas,
      'line',
      'Stock total',
      vm.stockEvolution.map((p) => p.label),
      vm.stockEvolution.map((p) => p.stockTotal),
      CHART.violet
    );
    const mine = vm.seller?.myDay?.last7Days ?? [];
    this.draw('mySales', this.mySalesCanvas, 'line', 'Mes ventes', mine.map((p) => p.label), mine.map((p) => p.total), CHART.blue);
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

/** Palette des graphiques (charte : bleu dominant, violet pour un indicateur secondaire). */
const CHART = {
  blue: '#2563EB',
  lightBlue: '#60A5FA',
  violet: '#7C3AED',
  navy: '#0B1F3A',
  text: '#64748B',
  grid: 'rgba(226, 232, 240, 0.8)'
};

/** Montants et quantités au format français (séparateur de milliers), présentation seule. */
const fr = (value: unknown) => (typeof value === 'number' ? value.toLocaleString('fr-FR') : String(value ?? ''));

const tooltip = {
  backgroundColor: CHART.navy,
  cornerRadius: 8,
  padding: 12,
  displayColors: false,
  titleFont: { size: 12, weight: 600 as const },
  bodyFont: { size: 13 },
  callbacks: {
    label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
      `${ctx.dataset.label ?? ''} : ${fr(ctx.parsed.y)}`
  }
};
const scales = {
  x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 }, color: CHART.text } },
  y: {
    beginAtZero: true,
    grid: { color: CHART.grid },
    border: { display: false },
    ticks: { font: { size: 11 }, color: CHART.text, padding: 8, callback: (v: string | number) => fr(v) }
  }
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
          backgroundColor: `${color}1A`,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: color,
          pointBorderWidth: 2,
          pointHoverRadius: 5,
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
      datasets: [{ label, data, backgroundColor: color, hoverBackgroundColor: CHART.blue, borderRadius: 6, borderSkipped: false, maxBarThickness: 28 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip },
      scales
    }
  };
}
