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
import { distinctUntilChanged, filter, map, Observable, shareReplay, startWith } from 'rxjs';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';


type DateColumn = {
  date: Date;
  inPrevMonth?: boolean;
  inNextMonth?: boolean;
  inPrevYear?: boolean;
  inNextYear?: boolean;
  isFirstDayOfMonth?: boolean;
  isFirstDayOfYear?: boolean;
}

@Component({
  selector: 'app-month',
  templateUrl: './month.component.html',
  styleUrls: ['./month.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthComponent implements OnInit {
  date: Observable<Date>;
  dates: Observable<DateColumn[]>;
  columnsPerRow: Observable<DateColumn[][]>;

  constructor(private router: Router,
              private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.date = this.router.events.pipe(
      startWith(new NavigationEnd(0, '', '')),  // To trigger initialization.
      filter((event) => event instanceof NavigationEnd),
      map<unknown, Date>(() => {
        // Sanitize the url segments, so we have a date to work with.
        const params = this.route.snapshot.params || {};
        const dateString: string = String(params['date']);
        // Like the date picker, this date string has to be parsed as local time, achieved by adding
        // the time *without* timezone offset. (It's interpreted as UTC if we parse the date only.)
        let date = new Date(dateString + 'T00:00:00');
        // Check date for validity, by casting it to number by prefixing with a plus (+) sign.
        // If date is NaN, it's invalid, and we return the current date.
        date = isNaN(+date) ? new Date() : date;
        return date;
      }),
      shareReplay(1)
    )

    this.dates = this.date.pipe(
      map<Date, [Date, Date, Date]>((d) => [
        new Date(d.getFullYear(), d.getMonth(), 1),
        new Date(d.getFullYear(), d.getMonth() + 1, 0),
        d
      ]),
      distinctUntilChanged(([afd], [bfd]) => +afd === +bfd),
      map<[Date, Date, Date], DateColumn[]>(([firstDate, lastDate, selectedDate]): DateColumn[] => {
        const dates: DateColumn[] = []

        const weekDay = firstDate.getDay();
        const lastDayNr = lastDate.getDate();
        const prepend = (weekDay === 0 ? 7 : weekDay) - 1;
        const add = lastDayNr;
        const lastDay = lastDate.getDay();
        const overflow = Math.max(0, 6 - ((lastDay === 0 ? 7 : lastDay) - 1));
        const fullYear = firstDate.getFullYear();
        let hasPrevYear = false;
        let hasNextYear = false;

        // Add days of previous month if it does not start on monday.
        let p = prepend;
        while (p > 0) {
          const prevDate = new Date(firstDate);
          prevDate.setDate(firstDate.getDate() - p);
          hasPrevYear = hasPrevYear || fullYear > prevDate.getFullYear()
          dates.push({
            date: prevDate,
            inPrevMonth: true,
            inPrevYear: hasPrevYear
          });
          p--;
        }

        let a = 0; // Ignore the first
        while (a < add + overflow) {
          const nextDate = new Date(firstDate);
          nextDate.setDate(firstDate.getDate() + a);
          const dateColumn: DateColumn = {
            date: nextDate
          }
          if (a === 0) {
            dateColumn.isFirstDayOfMonth = true;
          }
          if (a >= add) {
            hasNextYear = hasNextYear || fullYear < nextDate.getFullYear();
            dateColumn.inNextMonth = true;
            dateColumn.inNextYear = hasNextYear;
            if (a === add) {
              dateColumn.isFirstDayOfMonth = true;
            }
          }
          if (hasPrevYear && a === 0 || hasNextYear && a === add) {
            dateColumn.isFirstDayOfYear = true;
          }
          dates.push(dateColumn);
          a++;
        }
        return dates;
      }),
      shareReplay(1)
    )

    this.columnsPerRow = this.dates.pipe(
      map<DateColumn[], DateColumn[][]>((dates) => Array.from(
        {length: Math.ceil(dates.length / 7)},
        (v, i) => dates.slice(i * 7, i * 7 + 7)
      )),
    )
  }
}
