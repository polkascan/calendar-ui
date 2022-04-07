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

import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, interval, map, Observable, shareReplay, startWith, takeUntil } from 'rxjs';

export function getLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${('0' + String(date.getMonth() + 1)).slice(-2)}-${('0' + String(date.getDate())).slice(-2)}`;
}

export function getTodayDate(): Date {
  // This today date string has to be parsed as local time, achieved by adding the time *without* timezone offset.
  // (It's interpreted as UTC if we parse the selectedDate only.)
  return new Date(`${getLocalDateString(new Date())}T00:00:00`);
}

export function getDateFromRoute(router: Router, route: ActivatedRoute): Observable<Date> {
  // Listen to route changes and create a Date from the selectedDate param in the route.
  return router.events.pipe(
    startWith(new NavigationEnd(0, '', '')),  // To trigger initialization.
    filter((event) => event instanceof NavigationEnd),
    map<unknown, Date>(() => {
      // Sanitize the url segments, so we have a selectedDate to work with.
      const params = route.snapshot.params || {};
      const dateString = String(params['date']);
      // Like the selectedDate picker, this selectedDate string has to be parsed as local time, achieved by adding
      // the time *without* timezone offset. (It's interpreted as UTC if we parse the selectedDate only.)
      let date = new Date(dateString + 'T00:00:00');
      // Check selectedDate for validity, by casting it to number by prefixing with a plus (+) sign.
      // If selectedDate is NaN, it's invalid, and we return the current selectedDate.
      date = isNaN(+date) ? getTodayDate() : date;
      return date;
    }),
    shareReplay(1)
  );
}

export function getCurrentTime(): Observable<Date> {
  return interval(1000 * 60).pipe(
    startWith(0),
    map<number, Date>(() => new Date()),
    shareReplay(1)
  );
}

export function getDayProgressPercentage(date: Observable<Date>) {
  return date.pipe(
    map<Date, string>((date) => {
      const minutesPassed = date.getMinutes() + (60 * date.getHours());
      return `${Math.round(minutesPassed / (24 * 60) * 1000) / 10}%`;
    })
  );
}
