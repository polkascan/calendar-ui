/*
 * Polkascan Calendar UI
 * Copyright (C) 2018-2022 Polkascan Foundation (NL)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { distinctUntilChanged, map, Observable, shareReplay, Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { getDateFromRoute, getTodayDate } from '../../services/helpers';
import { DateColumn } from '../types';
import { CalendarService } from '../../services/calendar.service';
import { AppConfig } from '../../app-config';
import { PolkadaptService } from '../../services/polkadapt.service';

@Component({
  selector: 'app-month',
  templateUrl: './month.component.html',
  styleUrls: ['./month.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthComponent implements OnInit, AfterViewInit, OnDestroy {
  destroyer = new Subject<void>();
  date: Observable<Date>;
  dates: Observable<DateColumn[]>;
  columnsPerRow: Observable<DateColumn[][]>;
  today: Date;
  prevMonthDate: Observable<Date>;
  nextMonthDate: Observable<Date>;
  chainColors: {[network: string]: string | undefined} = {};

  constructor(private router: Router,
              private route: ActivatedRoute,
              private cal: CalendarService,
              private config: AppConfig,
              private pa: PolkadaptService,
              private host: ElementRef<HTMLElement>) {
  }

  ngOnInit(): void {
    this.today = getTodayDate();

    this.date = getDateFromRoute(this.router, this.route).pipe(takeUntil(this.destroyer));

    this.dates = this.date.pipe(
      map<Date, [Date, Date]>((d) => [
        new Date(d.getFullYear(), d.getMonth(), 1),
        new Date(d.getFullYear(), d.getMonth() + 1, 0)
      ]),
      distinctUntilChanged(([afd], [bfd]) => +afd === +bfd),
      map<[Date, Date], DateColumn[]>(([firstDate, lastDate]): DateColumn[] => {
        const dates: DateColumn[] = []

        const firstWeekDay = firstDate.getDay();
        const paddingBefore = (firstWeekDay === 0 ? 7 : firstWeekDay) - 1;
        const dayCount = lastDate.getDate();
        const lastWeekDay = lastDate.getDay();
        const paddingAfter = Math.max(0, 6 - ((lastWeekDay === 0 ? 7 : lastWeekDay) - 1));
        let hasPrevYear = false;
        let hasNextYear = false;

        // Add days of previous month if it does not start on monday.
        let p = paddingBefore;
        while (p > 0) {
          const prevDate = new Date(firstDate);
          prevDate.setDate(firstDate.getDate() - p);
          if (p === 0) {
            hasPrevYear = prevDate.getMonth() === 11;
          }
          dates.push({
            date: prevDate,
            inPrevMonth: true,
            inPrevYear: hasPrevYear,
            hoursWithItems: this.cal.getEventItemsPerHour(prevDate),
          });
          p--;
        }

        let a = 0;
        while (a < dayCount + paddingAfter) {
          const nextDate = new Date(firstDate);
          nextDate.setDate(firstDate.getDate() + a);

          const dateColumn: DateColumn = {
            date: nextDate
          }

          if (a === 0) {
            dateColumn.isFirstDayOfMonth = true;
            if (nextDate.getMonth() === 0) {
              dateColumn.isFirstDayOfYear = true;
            }
          }
          if (a === dayCount) {
            hasNextYear = nextDate.getMonth() === 0;
            dateColumn.isFirstDayOfMonth = true;
            if (hasNextYear) {
              dateColumn.isFirstDayOfYear = true;
            }
          }
          if (a >= dayCount) {
            dateColumn.inNextMonth = true;
            dateColumn.inNextYear = hasNextYear;
          }
          dateColumn.hoursWithItems = this.cal.getEventItemsPerHour(nextDate);
          dates.push(dateColumn);
          a++;
        }
        return dates;
      }),
      shareReplay(1)
    );

    this.columnsPerRow = this.dates.pipe(
      map<DateColumn[], DateColumn[][]>((dates) => Array.from(
        {length: dates.length / 7},
        (_, i) => dates.slice(i * 7, i * 7 + 7)
      ))
    );

    this.prevMonthDate = this.date.pipe(
      map((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    );

    this.nextMonthDate = this.date.pipe(
      map((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    );

    for (const n of Object.keys(this.pa.networks)) {
      this.chainColors[n] =  this.pa.networks[n].config.color;
    }
  }

  ngAfterViewInit(): void {
    this.date.subscribe(date => {
      let m: string = (date.getMonth() + 1).toString();
      if (m.length === 1) {
        m = '0' + m;
      }
      let d: string = date.getDate().toString();
      if (d.length === 1) {
        d = '0' + d;
      }
      const dateStr = `${date.getFullYear()}-${m}-${d}`;
      const dateEl: HTMLElement | null = this.host.nativeElement.querySelector(`.month-calendar-${dateStr}`);
      if (dateEl) {
        setTimeout(() => {
          dateEl.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }, 100);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackByIndex(i: number): number {
    return i;
  }
}
