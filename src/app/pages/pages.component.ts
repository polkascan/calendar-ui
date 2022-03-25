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

import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { BehaviorSubject, filter, map, pairwise, startWith } from 'rxjs';
import { MatCalendar, MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { getTodayDate } from '../services/helpers';

const viewNames = ['month', 'week', 'day'] as const;
type ViewName = typeof viewNames[number];

type NavProperties = {
  date: Date | null;
  view: ViewName;
}

@Component({
  selector: 'app-pages',
  templateUrl: './pages.component.html',
  styleUrls: ['./pages.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PagesComponent implements OnInit, AfterViewInit {
  date = new BehaviorSubject<Date | null>(null);
  view = new BehaviorSubject<ViewName>('month');
  navProperties = new BehaviorSubject<NavProperties | null>(null);

  @ViewChild('calendar', {static: false}) calendar: MatCalendar<Date>;

  dateClass: MatCalendarCellClassFunction<Date> = (cellDate, view) => {
    // Call a Service that checks for given selectedDate whether it has events or not.
    const hasEvents = false;
    return hasEvents ? 'calendar-picker-selectedDate-has-events' : '';
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    // Determine whether we need to change the url to selected selectedDate and view.
    this.navProperties.pipe(
      filter(p => Boolean(p)),  // Start processing after the properties have been initialized.
      map(p => p as NavProperties),  // Just a hint for typing purposes.
      pairwise<NavProperties>(),  // To compare old and new.
      map<(NavProperties)[], (string | null)[]>(([o, n]) => {
        // Convert dates to ISO selectedDate strings. Because the selectedDate is in user's timezone and the UTC selectedDate can be different,
        // we need to put the local selectedDate in the url.
        let od = o.date;
        let odString = '';
        if (od) {
          let oMonth: string = (od.getMonth() + 1).toString();
          if (oMonth.length === 1) {
            oMonth = '0' + oMonth;
          }
          let oDay: string = od.getDate().toString();
          if (oDay.length === 1) {
            oDay = '0' + oDay;
          }
          odString = `${od.getFullYear()}-${oMonth}-${oDay}`;
        }
        let nd = n.date;
        if (!nd) {
          nd = new Date();
        }
        let nMonth: string = (nd.getMonth() + 1).toString();
        if (nMonth.length === 1) {
          nMonth = '0' + nMonth;
        }
        let nDay: string = nd.getDate().toString();
        if (nDay.length === 1) {
          nDay = '0' + nDay;
        }
        let ndString = `${nd.getFullYear()}-${nMonth}-${nDay}`;

        return [odString, o.view, ndString, n.view];
      })
    ).subscribe(([od, ov, nd, nv]) => {
      const today: string = new Date().toISOString().substring(0, 10);
      let commands = [nv, nd];
      if (nd === today && nv === 'month') {
        commands = [''];
      }
      if (od && nd !== od || nv !== ov) {
        this.router.navigate(commands).then();
      }
    });

    // Listen to navigation event and see if we need to change variables based on the url.
    this.router.events.pipe(
      startWith(new NavigationEnd(0, '', '')),  // To trigger initialization.
      filter((event) => event instanceof NavigationEnd),
      map<unknown, [ViewName, Date]>(() => {
        // Sanitize the url segments, so we have a proper view name and selectedDate to work with.
        const url = this.route.snapshot.firstChild?.url;
        const view: ViewName = (url && url.length) ? url[0].path as ViewName : 'month';
        const params = this.route.snapshot.firstChild?.params || {};
        const dateString: string = String(params['date']);
        // Like the selectedDate picker, this selectedDate string has to be parsed as local time, achieved by adding
        // the time *without* timezone offset. (It's interpreted as UTC if we parse the selectedDate only.)
        let date = new Date(dateString+'T00:00:00');
        // Check selectedDate for validity, by casting it to number by prefixing with a plus (+) sign.
        // If selectedDate is NaN, it's invalid, and we return the current selectedDate.
        date = isNaN(+date) ? getTodayDate() : date;
        return [view, date];
      }),
    ).subscribe(([view, date]) => {
      if (!viewNames.includes(view)) {
        // Force a valid view name.
        view = 'month';
      }
      const oldView = this.view.getValue();
      let viewChanged = false;
      if (view !== oldView) {
        viewChanged = true;
        this.view.next(view);
      }
      const oldDate = this.date.getValue();
      let dateChanged = false;
      if (!oldDate || +date !== +oldDate) {
        dateChanged = true;
        this.date.next(date);
        if (this.calendar) {
          this.calendar._goToDateInView(date, 'month');
        }
      }
      if (viewChanged || dateChanged) {
        this.navProperties.next({date, view});
      }
    });
  }

  ngAfterViewInit(): void {
    // Listen to selectedDate clicks manually.
    this.calendar._userSelection.subscribe(event => {
      const date: Date | null = event.value;
      if (date) {
        const oldDate = this.date.getValue();
        const sameDate = oldDate && +date === +oldDate;
        let view: ViewName = this.view.getValue();
        let viewChanged = false;
        if (sameDate && view !== 'day') {
          view = 'day';
          viewChanged = true;
          this.view.next(view);
        }
        if (!sameDate) {
          this.date.next(date);
        }
        if (viewChanged || !sameDate) {
          this.navProperties.next({date, view});
        }
      }
    });
  }

  selectView(view: ViewName): void {
    this.view.next(view);
    const navProps: NavProperties | null = this.navProperties.getValue();
    if (navProps) {
      const {date} = navProps;
      this.navProperties.next({date, view});
    }
  }
}
