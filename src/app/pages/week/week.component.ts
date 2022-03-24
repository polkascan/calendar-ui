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

import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { getDateFromRoute, getTodayDate } from '../../services/helpers';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map, Observable, shareReplay, Subject, takeUntil } from 'rxjs';
import { DateColumn } from '../types';

@Component({
  selector: 'app-week',
  templateUrl: './week.component.html',
  styleUrls: ['./week.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeekComponent implements OnInit, OnDestroy {
  destroyer = new Subject<void>();
  today: Date;
  selectedDate: Observable<Date>;
  dates: Observable<DateColumn[]>;
  prevWeekDate: Observable<Date>;
  nextWeekDate: Observable<Date>;

  constructor(
    private router: Router,
    private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.today = getTodayDate();

    this.selectedDate = getDateFromRoute(this.router, this.route).pipe(takeUntil(this.destroyer));

    // Create an Array of days of the week for given selectedDate.
    this.dates = this.selectedDate.pipe(
      map<Date, Date[]>(date => {
        const dateMs: number = date.getTime();
        // Make day of week start on Monday, as defined in ISO.
        let dayOfWeek: number = date.getDay();
        if (dayOfWeek === 0) {
          // Sunday
          dayOfWeek = 6;
        } else {
          dayOfWeek -= 1;
        }
        const startOfWeekMs: number = dateMs - dayOfWeek * 24 * 60 * 60 * 1000;
        const weekDates: Date[] = [0, 1, 2, 3, 4, 5, 6].map(
          i => new Date(startOfWeekMs + i * 24 * 60 * 60 * 1000)
        );
        return weekDates;
      }),
      // Only continue if the first day of the week changes. It doesn't if selected selectedDate changes and stays within same week.
      distinctUntilChanged(([afd], [bfd]) => +afd === +bfd),
      // Turn the dates into data for the template.
      map<Date[], DateColumn[]>(dates => dates.map(date => {
        return {
          date,
          isFirstDayOfMonth: date.getDate() === 1,
          isFirstDayOfYear: date.getMonth() === 0
        };
      })),
      shareReplay(1)
    );

    this.prevWeekDate = this.dates.pipe(
      map(dates => new Date(dates[0].date.getTime() - 7 * 24 * 60 * 60 * 1000))
    );

    this.nextWeekDate = this.dates.pipe(
      map(dates => new Date(dates[0].date.getTime() + 7 * 24 * 60 * 60 * 1000))
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

}
