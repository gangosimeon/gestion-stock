import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';

import { ReportsFacade } from '../data/reports.facade';
import { ReportsTab } from '../data/reports-vm.model';

@Component({
  selector: 'app-reports-shell-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatTableModule,
    MatProgressBarModule
  ],
  templateUrl: './reports-shell-page.component.html',
  styleUrl: './reports-shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsShellPageComponent implements AfterViewInit, OnDestroy {
  readonly facade = inject(ReportsFacade);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('salesCanvas') salesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('profitCanvas') profitCanvas!: ElementRef<HTMLCanvasElement>;

  private salesChart: Chart | null = null;
  private profitChart: Chart | null = null;

  readonly dateCtrl = new FormControl<Date>(new Date(), { nonNullable: true });
  readonly monthCtrl = new FormControl<string>(new Date().toISOString().slice(0, 7), { nonNullable: true });
  readonly yearCtrl = new FormControl<number>(new Date().getFullYear(), { nonNullable: true });

  readonly displayedColumns = ['product', 'quantity', 'total', 'profit'] as const;

  readonly vm$ = this.facade.vm$;

  private vmSnapshot: any = null;

  readonly years = this.buildYears();

  constructor() {
    Chart.register(...registerables);
    this.facade.refresh();

    this.dateCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((d) => this.facade.setDate(d));
    this.monthCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((m) => this.facade.setMonth(m));
    this.yearCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((y) => this.facade.setYear(y));
  }

  ngAfterViewInit(): void {
    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot = vm;
      this.syncControls(vm);

      this.renderSales(vm.salesSeries.map((p) => p.label), vm.salesSeries.map((p) => p.value));
      this.renderProfit(vm.profitSeries.map((p) => p.label), vm.profitSeries.map((p) => p.value));
    });
  }

  async exportExcel(): Promise<void> {
    if (!this.vmSnapshot) return;
    const vm = this.vmSnapshot as any;

    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();

    const kpis = [
      ['totalSales', vm.kpis.totalSales],
      ['profit', vm.kpis.profit],
      ['transactionsCount', vm.kpis.transactionsCount]
    ];
    const wsKpi = XLSX.utils.aoa_to_sheet([['kpi', 'value'], ...kpis]);
    XLSX.utils.book_append_sheet(wb, wsKpi, 'KPIs');

    const wsTop = XLSX.utils.json_to_sheet(
      (vm.topProducts ?? []).map((r: any) => ({
        sku: r.sku,
        name: r.name,
        quantity: r.quantity,
        total: r.total,
        profit: r.profit
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsTop, 'TopProducts');

    const wsSeries = XLSX.utils.json_to_sheet(
      (vm.salesSeries ?? []).map((s: any, idx: number) => ({
        label: s.label,
        sales: s.value,
        profit: vm.profitSeries?.[idx]?.value ?? 0
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsSeries, 'Series');

    const fileName = `reports_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.salesChart?.destroy();
    this.profitChart?.destroy();
  }

  onTabChange(ev: MatTabChangeEvent): void {
    const tab: ReportsTab = ev.index === 0 ? 'DAILY' : ev.index === 1 ? 'MONTHLY' : 'YEARLY';
    this.facade.setTab(tab);
  }

  refresh(): void {
    this.facade.refresh();
  }

  private renderSales(labels: string[], data: number[]): void {
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
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    };

    if (!this.salesChart) {
      this.salesChart = new Chart(this.salesCanvas.nativeElement, config);
      return;
    }

    this.salesChart.data.labels = labels;
    this.salesChart.data.datasets[0].data = data;
    this.salesChart.update();
  }

  private renderProfit(labels: string[], data: number[]): void {
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Bénéfice',
            data,
            backgroundColor: 'rgba(76, 175, 80, 0.6)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    };

    if (!this.profitChart) {
      this.profitChart = new Chart(this.profitCanvas.nativeElement, config);
      return;
    }

    this.profitChart.data.labels = labels;
    this.profitChart.data.datasets[0].data = data;
    this.profitChart.update();
  }

  private buildYears(): number[] {
    const y = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => y - i);
  }

  private syncControls(vm: { filters: { date: Date; month: string; year: number } }): void {
    const currentDate = this.dateCtrl.value;
    if (!currentDate || currentDate.getTime() !== vm.filters.date.getTime()) {
      this.dateCtrl.setValue(vm.filters.date, { emitEvent: false });
    }

    if (this.monthCtrl.value !== vm.filters.month) {
      this.monthCtrl.setValue(vm.filters.month, { emitEvent: false });
    }

    if (this.yearCtrl.value !== vm.filters.year) {
      this.yearCtrl.setValue(vm.filters.year, { emitEvent: false });
    }
  }
}
