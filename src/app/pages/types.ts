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

import { Observable } from 'rxjs';

export type EventItem = {
  network: string;
  type: string;
  date: Date;
  block: number;
  description: string;
  data?: { [key: string]: any }
  networkLogo?: string;
  networkName?: string;
};

export type DateColumn = {
  date: Date;
  inPrevMonth?: boolean;
  inNextMonth?: boolean;
  inPrevYear?: boolean;
  inNextYear?: boolean;
  isFirstDayOfMonth?: boolean;
  isFirstDayOfYear?: boolean;
  isToday?: boolean;
  hoursWithItems?: Observable<EventItem[][]>;
};

export type PjsCalendarItemDuration = {
  startDate?: Date;
  endDate?: Date;
  startBlockNumber?: number;
  endBlockNumber?: number;
  duration?: number;
}

export type PjsCalendarItem = PjsCalendarItemDuration & {
  network: string;
  type: string;
  data: { [key: string]: any };
}
