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

import { Component } from '@angular/core';
import { PolkadaptService } from './services/polkadapt.service';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'calendar-ui';

  constructor(private testPolkadaptService: PolkadaptService) {
    this.fetchSomeInformation();
  }

  async fetchSomeInformation(): Promise<void> {
    for (let network of Object.keys(this.testPolkadaptService.networkAdapters)) {
      this.testPolkadaptService.networkAdapters[network].connected.pipe(
        filter((b) => b),
        take(1)
      ).subscribe(async (): Promise<void> => {
        const blockTime = await this.testPolkadaptService.run(network).consts['babe']['expectedBlockTime'];
        const bestNumber = await this.testPolkadaptService.run(network).derive.chain.bestNumber();
        console.log(`${network} blockTime = ${(blockTime as any).toNumber()} bestNumber = ${bestNumber}`);
      });
    }
  }
}
