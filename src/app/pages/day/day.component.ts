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

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { distinctUntilChanged, interval, map, Observable, shareReplay, startWith, Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { getDateFromRoute, getTodayDate } from '../../services/helpers';
import { DateColumn } from '../types';

const minutesPerDay = 60 * 24;


@Component({
  selector: 'app-day',
  templateUrl: './day.component.html',
  styleUrls: ['./day.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DayComponent implements OnInit {
  date: Observable<Date>;
  dateColumn: Observable<DateColumn>;
  today: Date;
  prevDayDate: Observable<Date>;
  nextDayDate: Observable<Date>;
  currentTime: Observable<Date>;
  timeLinePerc: Observable<string>;

  private destroyer = new Subject<void>();

  constructor(private router: Router,
              private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.today = getTodayDate();

    this.date = getDateFromRoute(this.router, this.route).pipe(takeUntil(this.destroyer));

    this.dateColumn = this.date.pipe(
      distinctUntilChanged((ad, bd) => +ad === +bd),
      map<Date, DateColumn>((date) => {
        const dateColumn: DateColumn = {
          date: date,
        };

        const dayCount = date.getDate();
        const month = date.getMonth();
        if (dayCount === 1) {
          dateColumn.isFirstDayOfMonth = true;
          if (month === 0) {
            dateColumn.isFirstDayOfYear = true;
          }
        }

        if (+date === +this.today) {
          dateColumn.isToday = true;
        }

        return dateColumn;
      })
    )

    this.prevDayDate = this.date.pipe(
      map((date) => {
        const prevDate = new Date(date);
        prevDate.setDate(date.getDate() - 1);
        return prevDate;
      })
    );

    this.nextDayDate = this.date.pipe(
      map((date) => {
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        return nextDate;
      })
    );

    this.currentTime = interval(1000 * 60).pipe(
      takeUntil(this.destroyer),
      startWith(0),
      map<number, Date>(() => new Date()),
      shareReplay(1)
    )

    this.timeLinePerc = this.currentTime.pipe(
      takeUntil(this.destroyer),
      map<Date, string>((date) => {
        const minutesPassed = date.getMinutes() + (60 * date.getHours());
        return Math.floor(minutesPassed / minutesPerDay * 100) + '%';
      })
    )
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }
}



