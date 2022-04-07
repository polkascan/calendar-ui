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

import { Injectable } from '@angular/core';
import { CalenderItemsPerChain, PolkadotJsScheduledService } from './polkadot-js-scheduled.service';
import { EventItem } from '../pages/types';
import { BehaviorSubject, map, Observable, startWith, Subject, Subscription } from 'rxjs';
import { getLocalDateString } from './helpers';

@Injectable({providedIn: 'root'})
export class CalendarService {
  eventItemsChanged = new Subject<void>();
  eventItemsSubscription: Subscription;
  private eventItems: { [date: string]: BehaviorSubject<EventItem[]> } = {};

  constructor(private pjss: PolkadotJsScheduledService) {
    this.eventItemsSubscription = this.pjss.dataChanged.pipe(
      startWith(this.pjss.calendarItemsPerChain),
    ).subscribe((calenderItemsPerChain) => {
      this.generateEventItems(calenderItemsPerChain);
      this.eventItemsChanged.next();
    });
  }

  getEventItems(date: string): BehaviorSubject<EventItem[]> {
    if (!Object.keys(this.eventItems).includes(date)) {
      this.eventItems[date] = new BehaviorSubject<EventItem[]>([]);
    }
    return this.eventItems[date];
  }

  generateEventItems(calenderItemsPerChain: CalenderItemsPerChain): void {
    const byDate: { [date: string]: EventItem[] } = {};
    calenderItemsPerChain.forEach((calendarItems) => {
      calendarItems.forEach((ci) => {
        const date = ci.endDate || ci.startDate;
        const block = ci.endBlockNumber || ci.startBlockNumber;

        if (date && block) {
          const dateKey: string = getLocalDateString(date);

          if (!Object.keys(byDate).includes(dateKey)) {
            byDate[dateKey] = [];
          }
          const item: EventItem = {
            network: ci.network,
            date,
            block,
            type: ci.type,
            description: this.getPjsItemDescription(ci.type, ci.data),
            data: ci.data
          }
          byDate[dateKey].push(item);
        }
      });
    });
    for (const [dateKey, items] of Object.entries(byDate)) {
      this.getEventItems(dateKey).next(items);
    }
  }

  getEventItemsPerHour(date: Date): Observable<EventItem[][]> {
    const dateKey: string = getLocalDateString(date);
    return this.getEventItems(dateKey).pipe(
      map<EventItem[], EventItem[][]>(items => {
        const itemsPerHour: EventItem[][] = [];
        for (let i = 0; i < 24; i++) {
          itemsPerHour.push([]);
        }
        items.forEach(item => {
          itemsPerHour[item.date.getHours()].push(item);
        });
        itemsPerHour.forEach(hourItems => {
          hourItems.sort(
            (a, b) => a.date.getTime() - b.date.getTime()
          );
        });
        return itemsPerHour;
      })
    );
  }

  getPjsItemDescription(type: string, data: { [key: string]: unknown }): string {
    // These are copied from PolkadotJS for now.

    switch (type) {
      case 'councilElection':
        return `Election of new council candidates (period ${data.electionRound as number})`;

      case 'councilMotion':
        return `Voting ends on council motion ${(data.hash as string).substring(0, 6)}…${(data.hash as string).substring((data.hash as string).length - 4)}`;

      case 'democracyDispatch':
        return `Enactment of the result of referendum ${data.index as number}`

      case 'democracyLaunch':
        return `Start of the next referendum voting period (${data.launchPeriod as number})`;

      case 'parachainAuction':
        return `End of the current parachain auction ${data.leasePeriod as number} - ${(data.leasePeriod as number) + (data.leasePeriodPerSlot as number) - 1}`;

      case 'parachainLease':
        return `Start of the next parachain lease period ${data.leasePeriod as number}`;

      case 'referendumDispatch':
        return `Potential dispatch of referendum ${data.index as number} (if passed)`;

      case 'referendumVote':
        return `Voting ends for referendum ${data.index as number}`;

      case 'scheduler':
        return data.id
          ? `Execute named scheduled task ${data.id as string}`
          : `Execute anonymous scheduled task`;

      case 'stakingEpoch':
        return `Start of a new staking session ${data.index as number}`;

      case 'stakingEra':
        return `Start of a new staking era ${data.index as number}`;

      case 'stakingSlash':
        return `Application of slashes from era ${data.index as number}`;

      case 'treasurySpend':
        return `Start of next spending period (${data.spendingPeriod as number})`;

      case 'societyChallenge':
        return `Start of next membership challenge period (${data.challengePeriod as number})`;

      case 'societyRotate':
        return `Acceptance of new members and bids (round ${data.rotateRound as number})`;

      default:
        return `Unknown event`;
    }
  }
}
