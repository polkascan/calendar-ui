/*
 * Polkascan Explorer UI
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
import { Polkadapt, PolkadaptRunConfig } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import { AppConfig } from '../app-config';
import { Subject, Subscription } from 'rxjs';

export type AugmentedApi = substrate.Api;

type AdapterName = 'substrateRpc';

@Injectable({providedIn: 'root'})
export class PolkadaptService {
  polkadapt: Polkadapt<AugmentedApi>;
  run: (config?: PolkadaptRunConfig | string) => AugmentedApi;

  badAdapterUrls: { [network: string]: { [K in AdapterName]: string[] } } = {};

  availableAdapters: {
    [network: string]: {
      substrateRpc: substrate.Adapter
    }
  } = {};

  private sleepDetectorWorker: Worker;
  triggerReconnect: Subject<any> = new Subject();
  private triggerReconnectSubscription: Subscription;

  private onlineHandler: EventListener = (ev) => {
    // In case the browser comes online, try and reconnect websockets.
    this.triggerReconnect.next(null);
  };

  constructor(private config: AppConfig) {
    this.setAvailableAdapters();
    this.polkadapt = new Polkadapt();
    this.run = this.polkadapt.run.bind(this.polkadapt);

    // Create a detector for suspended computers.
    // A web worker will keep running, even if the browser tab is inactive, therefor the timer that runs in
    // the worker will only take longer if the computer is suspended or the browser got stalled.
    if (typeof Worker !== 'undefined') {
      this.sleepDetectorWorker = new Worker(new URL('./polkadapt.worker', import.meta.url));
      this.sleepDetectorWorker.onmessage = ({data}) => {
        if (data === 'wake') {
          // Detected a suspended computer or stalled browser. Try and reconnect websockets.
          this.triggerReconnect.next(null);
        }
      };
    } else {
      // Web workers are not supported in this environment.
    }
  }

  setAvailableAdapters(): void {
    for (const network of Object.keys(this.config.networks)) {
      this.availableAdapters[network] = {
        substrateRpc: new substrate.Adapter({
          chain: network
        })
      };
      this.badAdapterUrls[network] = {
        substrateRpc: []
      };
    }
  }

  async activateNetwork(network: string): Promise<void> {
    // TODO activate the adapter for the added network, also create fallback functionality.

    // Reconnect on sleep and/or online event.
    // if (this.sleepDetectorWorker) {
    //   this.sleepDetectorWorker.postMessage('start');
    // }
    // window.addEventListener('online', this.onlineHandler);

    // Wait until PolkADAPT has initialized all adapters.
    await this.polkadapt.ready();
  }

  deactivateNetwork(network: string): void {
    // TODO Unregister the adapters for the network
    const activeAdapters: any[] = [];

    this.polkadapt.unregister(...activeAdapters);

    // if (this.sleepDetectorWorker) {
    //   this.sleepDetectorWorker.postMessage('stop');
    // }
    // window.removeEventListener('online', this.onlineHandler);

  }

  configureSubstrateRpcUrl(network: string): void {
  }

  reconnectSubstrateRpc(network: string): void {
  }

  async setSubstrateRpcUrl(network: string, url: string): Promise<void> {
    window.localStorage.setItem(`lastUsedSubstrateRpcUrl-${network}`, url);
    this.availableAdapters[network].substrateRpc.setUrl(url);
    // substrateRpcUrl.next(url);
    // if (this.substrateRpcRegistered.value) {
    //   await this.availableAdapters[this.currentNetwork].substrateRpc.connect();
    // } else {
    //   // Not registered, so let's try this url as well as the others again.
    //   this.badAdapterUrls[this.currentNetwork].substrateRpc.length = 0;
    //   this.polkadapt.register(this.availableAdapters[this.currentNetwork].substrateRpc);
    // }
  }


  forceReconnect(network: string): void {
    this.reconnectSubstrateRpc(network);
  }
}
