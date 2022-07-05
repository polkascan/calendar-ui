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
import { NetworkAdapters, PolkadaptService } from './polkadapt.service';
import { BehaviorSubject } from 'rxjs';


@Injectable({providedIn: 'root'})
export class NetworkService {
  activeNetworks: NetworkAdapters = {};
  connecting = new BehaviorSubject<number>(0);

  constructor(private pa: PolkadaptService) {
  }

  async initialize(): Promise<void> {
    // Todo, use persistent settings.

    // When there are no persistent settings set, look for default active chains in the config.
    await Promise.allSettled(
      Object.entries(this.pa.networkAdapters)
        .filter(([_, network]) => network.config.defaultActive)
        .map(([n, _]) => this.enableNetwork(n))
    );
  }

  async enableNetwork(network: string): Promise<NetworkAdapters> {
    this.connecting.next(this.connecting.value + 1);
    const result = await this.pa.activateRPCAdapter(network);
    Object.assign(this.activeNetworks, result);
    this.connecting.next(this.connecting.value - 1);
    return result;
  }


  disableNetwork(network: string): void {
    this.pa.deactivateRPCAdapter(network);
  }
}
