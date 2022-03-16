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

import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { PagesComponent } from './pages.component';

export function monthMatcher(url: UrlSegment[]): UrlMatchResult | null {
  if (url.length === 0 || url[0].path === 'month' && !url[1]) {
    return {
      consumed: url
    }
  } else if (url[0].path === 'month') {
    return {
      consumed: url,
      posParams: {
        date: url[1]
      },
    };
  }
  return null;
}

export function weekMatcher(url: UrlSegment[]): UrlMatchResult | null {
  const result: UrlMatchResult = {consumed: url};
  if (url[0]?.path === 'week') {
    if (url[1]) {
      result.posParams = {date: url[1]};
    }
    return result;
  }
  return null;
}

export function dayMatcher(url: UrlSegment[]): UrlMatchResult | null {
  const result: UrlMatchResult = {consumed: url};
  if (url[0]?.path === 'day') {
    if (url[1]) {
      result.posParams = {date: url[1]};
    }
    return result;
  }
  return null;
}

const routes: Routes = [
  {
    path: '',
    component: PagesComponent,
    children: [
      {
        matcher: monthMatcher,
        loadChildren: () => import('./month/month.module').then(m => m.MonthModule),
      },
      {
        matcher: weekMatcher,
        loadChildren: () => import('./week/week.module').then(m => m.WeekModule),
      },
      {
        matcher: dayMatcher,
        loadChildren: () => import('./day/day.module').then(m => m.DayModule),
      },
      {
        path: 'list/:fromDate/:toDate',
        loadChildren: () => import('./list/list.module').then(m => m.ListModule),
      },
      {
        path: '',
        loadChildren: () => import('./month/month.module').then(m => m.MonthModule),
      },
    ]
  }
];

@NgModule({
  declarations: [],
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class PagesRoutingModule { }
