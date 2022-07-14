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
import { Network, PolkadaptService } from './polkadapt.service';
import { BehaviorSubject } from 'rxjs';
import { PolkadotJsScheduledService } from './polkadot-js-scheduled.service';
import { AppConfig, NetworkConfig, RelayChainConfig } from '../app-config';


@Injectable({providedIn: 'root'})
export class NetworkService {
  activeNetworks = new BehaviorSubject<Network[]>([]);
  connecting = new BehaviorSubject<number>(0);
  customNetworks: NetworkConfig = {};

  constructor(private config: AppConfig,
              private pa: PolkadaptService,
              private pjss: PolkadotJsScheduledService) {
  }

  async initialize(): Promise<void> {
    this.pa.setAvailableAdapters(this.config.networks);
    try {
      this.customNetworks = JSON.parse(localStorage['customNetworks'] as string) as NetworkConfig;
    } catch (e) {
      // No custom networks set.
    }
    this.pa.setAvailableAdapters(this.customNetworks, true);

    let activatedNetworks: string[] = [];
    try {
      const names = Object.keys(this.pa.networks);
      activatedNetworks = JSON.parse(localStorage['userActivatedNetworks'] as string) as string[];

      // Check if custom network still exists, if not ignore it.
      activatedNetworks = activatedNetworks.filter((n) => names.includes(n));

    } catch (e) {
      // Do nothing.
    }

    // When there are no persistent settings or there is no active network, look for default active chains in the config.
    if (activatedNetworks.length === 0) {
      activatedNetworks = Object.entries(this.pa.networks)
        .filter(([_, network]) => network.config.defaultActive)
        .map(([n, _]) => n)
    }

    await this.enableNetworks(activatedNetworks);
  }

  async enableNetworks(networks: string[]): Promise<void> {
    const activeNetworks = this.activeNetworks.value;
    for (const network of networks) {
      this.pa.networks[network].initializing.next(true);
      this.pa.networks[network].failed.next(false);
      if (activeNetworks.indexOf(this.pa.networks[network]) === -1) {
        activeNetworks.push(this.pa.networks[network]);
      }
    }
    this.sortActiveNetworks();
    this.activeNetworks.next(activeNetworks);
    this.storeActiveNetworks();
    await Promise.allSettled(networks.map(n => this.loadNetwork(n)));
  }

  async loadNetwork(network: string): Promise<void> {
    if (Object.keys(this.pa.networks[network].config.substrateRpcUrls).length > 0) {
      this.connecting.next(this.connecting.value + 1);
      try {
        await this.pa.activateRPCAdapter(network);
        void this.pjss.initializeChain(network);
      } catch (e) {
        this.pa.networks[network].failed.next(true);
        console.error([NetworkService], e);
      }
      this.connecting.next(this.connecting.value - 1);
      this.pa.networks[network].initializing.next(false);
    } else {
      console.error(`Network '${this.pa.networks[network].config.name}' has no provider URL set.`);
    }
  }

  disableNetwork(network: string): void {
    const index: number = this.activeNetworks.value.indexOf(this.pa.networks[network]);
    if (index > -1) {
      this.activeNetworks.value.splice(index, 1);
      this.activeNetworks.next(this.activeNetworks.value);
      this.storeActiveNetworks();
    }
    this.pjss.removeChain(network);
    this.pa.deactivateRPCAdapter(network);
  }

  setCustomNetwork(name: string, label: string, substrateUrl?: string): Network {
    if (!this.customNetworks) {
      this.customNetworks = {};
    }
    let substrateRpcUrls = {};
    if (substrateUrl) {
      substrateRpcUrls = {'Custom': substrateUrl};
    } else if (this.customNetworks[name]) {
      substrateRpcUrls = this.customNetworks[name].substrateRpcUrls;
    }
    const customConfig: RelayChainConfig = {
      name: label,
      substrateRpcUrls
    };
    if (!this.customNetworks[name]) {
      // New one.
      this.pa.setAvailableAdapter(name, customConfig, true);
      this.activeNetworks.value.push(this.pa.networks[name]);
      this.storeActiveNetworks();
    } else {
      this.pa.networks[name].config = customConfig;
    }
    this.sortActiveNetworks();
    this.activeNetworks.next(this.activeNetworks.value);
    this.customNetworks[name] = customConfig;
    localStorage['customNetworks'] = JSON.stringify(this.customNetworks);
    return this.pa.networks[name];
  }

  deleteCustomNetwork(name: string) {
    delete this.customNetworks[name];
    localStorage['customNetworks'] = JSON.stringify(this.customNetworks);
    const network: Network = this.pa.networks[name];
    const index = this.activeNetworks.value.indexOf(network);
    if (index > -1) {
      this.activeNetworks.value.splice(index, 1);
      this.activeNetworks.next(this.activeNetworks.value);
      this.storeActiveNetworks();
    }
    this.pa.deleteAvailableAdapter(name);
  }

  sortActiveNetworks(): void {
    this.activeNetworks.value.sort(
      (a, b) =>
        (!a.isCustom && b.isCustom) ? 1 : (a.isCustom && !b.isCustom) ? -1 :
          (a.config.name > b.config.name) ? 1 : (a.config.name < b.config.name) ? -1 :
            0
    );
  }

  storeActiveNetworks(): void {
    localStorage['userActivatedNetworks'] = JSON.stringify(this.activeNetworks.value.map((n) => n.name));
  }
}
