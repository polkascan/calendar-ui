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

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { BehaviorSubject, filter, map, pairwise, startWith, Subject, takeUntil } from 'rxjs';
import { MatCalendar, MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { getLocalDateString, getTodayDate } from '../services/helpers';
import { CalendarService } from '../services/calendar.service';
import { NetworkManager } from '../components/network-manager/network-manager.component';
import { MatDialog } from '@angular/material/dialog';
import { NetworkService } from '../services/network.service';
import { PolkadotJsScheduledService } from '../services/polkadot-js-scheduled.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PagesComponent implements OnInit, AfterViewInit, OnDestroy {
  date = new BehaviorSubject<Date | null>(null);
  view = new BehaviorSubject<ViewName>('month');
  navProperties = new BehaviorSubject<NavProperties | null>(null);
  networkConfig = new Map();

  @ViewChild('calendar', {static: false}) calendar: MatCalendar<Date>;

  dateClassFn: MatCalendarCellClassFunction<Date> = (cellDate: Date) => {
    const classes = [];
    // Call a Service that checks for given selectedDate whether it has events or not.
    // The service needs local date strings.
    const dateKey: string = getLocalDateString(cellDate);
    const hasEvents: boolean = this.cal.getEventItems(dateKey).getValue().length > 0;
    if (hasEvents) {
      classes.push('calendar-picker-date-has-events');
    }
    if (+cellDate < +getTodayDate()) {
      classes.push('calendar-picker-date-past');
    }
    return classes.join(' ');
  }

  private destroyer = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cal: CalendarService,
    public dialog: MatDialog,
    public ns: NetworkService,
    public pjss: PolkadotJsScheduledService
  ) {
  }

  ngOnInit(): void {
    // Determine whether we need to change the url to selected selectedDate and view.
    this.navProperties.pipe(
      filter((p): p is NavProperties => !!p),  // Start processing after the properties have been initialized.
      pairwise<NavProperties>(),  // To compare old and new.
      map<(NavProperties)[], (string | null)[]>(([o, n]) => {
        // Convert dates to ISO selectedDate strings. Because the selectedDate is in user's timezone and the UTC selectedDate can be different,
        // we need to put the local selectedDate in the url.
        const od: string = o.date ? getLocalDateString(o.date) : '';
        const nd: string = getLocalDateString(n.date || new Date());
        return [od, o.view, nd, n.view];
      })
    ).subscribe(([od, ov, nd, nv]) => {
      const today: string = getLocalDateString(new Date());
      let commands = [nv, nd];
      if (nd === today && nv === 'month') {
        commands = [''];
      }
      if (od && nd !== od || nv !== ov) {
        void this.router.navigate(commands);
      }
    });

    // Listen to navigation event and see if we need to change variables based on the url.
    this.router.events.pipe(
      startWith(new NavigationEnd(0, '', '')),  // To trigger initialization.
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map<NavigationEnd, [ViewName, Date]>(() => {
        // Sanitize the url segments, so we have a proper view name and selectedDate to work with.
        const url = this.route.snapshot.firstChild?.url;
        const view: ViewName = (url && url.length) ? url[0].path as ViewName : 'month';
        const params = this.route.snapshot.firstChild?.params || {};
        const dateString = String(params['date']);
        // Like the selectedDate picker, this selectedDate string has to be parsed as local time, achieved by adding
        // the time *without* timezone offset. (It's interpreted as UTC if we parse the selectedDate only.)
        let date = new Date(dateString + 'T00:00:00');
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

    this.cal.eventItemsChanged.pipe(
      takeUntil(this.destroyer)
    ).subscribe(() => this.calendar.updateTodaysDate());
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  selectView(view: ViewName): void {
    this.view.next(view);
    const navProps: NavProperties | null = this.navProperties.getValue();
    if (navProps) {
      const {date} = navProps;
      this.navProperties.next({date, view});
    }
  }

  selectToday(): void {
    const navProps: NavProperties | null = this.navProperties.getValue();
    if (navProps) {
      const {view} = navProps;
      void this.router.navigate([view]);
    }
  }

  openChainManager(): void {
    this.dialog.open(NetworkManager);
  }
}
