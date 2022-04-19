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
import { Polkadapt, PolkadaptRunConfig } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import { AppConfig } from '../app-config';
import { BehaviorSubject, Subject, Subscription, throttleTime } from 'rxjs';

export type AugmentedApi = substrate.Api;

type AdapterName = 'substrateRpc';

@Injectable({providedIn: 'root'})
export class PolkadaptService {
  polkadapt: Polkadapt<AugmentedApi>;
  run: (config?: PolkadaptRunConfig | string) => AugmentedApi;

  badAdapterUrls: { [network: string]: { [K in AdapterName]: string[] } } = {};

  networkAdapters: {
    [network: string]: {
      substrateRpc: substrate.Adapter;
      url: BehaviorSubject<string>;
      urls: BehaviorSubject<string[]>;
      registered: BehaviorSubject<boolean>;
      connected: BehaviorSubject<boolean>;
      errorHandler?: () => void;
      connectedHandler?: () => void;
      disconnectedHandler?: () => void;
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

    for (const network of Object.keys(this.networkAdapters)) {
      void this.activateRPCAdapter(network);
    }

    // TODO Activate Calendar Adapter when available.

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
      this.sleepDetectorWorker.postMessage('start');

    } else {
      // Web workers are not supported in this environment.
    }

    window.addEventListener('online', this.onlineHandler);

    // Throttle the reconnect trigger (can also be triggered from outside this service).
    this.triggerReconnectSubscription = this.triggerReconnect
      .pipe(throttleTime(5000))
      .subscribe(() => this.forceReconnect());
  }

  setAvailableAdapters(): void {
    for (const network of Object.keys(this.config.networks)) {
      this.networkAdapters[network] = {
        substrateRpc: new substrate.Adapter({
          chain: network
        }),
        url: new BehaviorSubject(''),
        urls: new BehaviorSubject([] as string[]),
        registered: new BehaviorSubject<boolean>(false),
        connected: new BehaviorSubject<boolean>(false)
      };
      this.badAdapterUrls[network] = {
        substrateRpc: []
      };
    }
  }

  async activateRPCAdapter(network: string): Promise<void> {
    this.configureSubstrateRpcUrl(network);
    const ana = this.networkAdapters[network];
    const sAdapter = ana.substrateRpc;

    ana.errorHandler = () => {
      this.reconnectSubstrateRpc(network);
    };
    sAdapter.on('error', ana.errorHandler);

    ana.connectedHandler = () => {
      ana.connected.next(true);
    };
    sAdapter.on('connected', ana.connectedHandler);

    ana.disconnectedHandler = () => {
      ana.connected.next(false);
    };
    sAdapter.on('disconnected', ana.disconnectedHandler);

    ana.urls.next(this.config.networks[network].substrateRpcUrlArray);

    try {
      this.polkadapt.register(sAdapter);
      ana.registered.next(true);
    } catch (e) {
      ana.registered.next(false);
      throw e;
    }

    // Wait until PolkADAPT has initialized all adapters.
    await this.polkadapt.ready();
  }

  deactivateRPCAdapter(network: string): void {
    const ana = this.networkAdapters[network];
    const sAdapter = ana.substrateRpc;
    if (sAdapter) {
      this.polkadapt.unregister(sAdapter);
      ana.registered.next(false);
      ana.connected.next(false);

      if (ana.errorHandler) {
        sAdapter.off('error', ana.errorHandler);
      }
      if (ana.connectedHandler) {
        sAdapter.off('connected', ana.connectedHandler);
      }
      if (ana.disconnectedHandler) {
        sAdapter.off('disconnected', ana.disconnectedHandler);
      }
    }
  }

  configureSubstrateRpcUrl(network: string): void {
    const substrateRpcUrls = this.config.networks[network].substrateRpcUrlArray;
    let substrateRpcUrl = window.localStorage.getItem(`lastUsedSubstrateRpcUrl-${network}`);
    if (!substrateRpcUrl) {
      const badSubstrateRpcUrls = this.badAdapterUrls[network].substrateRpc;
      if (badSubstrateRpcUrls.length >= substrateRpcUrls.length) {
        // All url's are marked bad, so let's just try all of them again.
        badSubstrateRpcUrls.length = 0;
      }
      substrateRpcUrl = substrateRpcUrls.filter(url => !badSubstrateRpcUrls.includes(url))[0];
      window.localStorage.setItem(`lastUsedSubstrateRpcUrl-${network}`, substrateRpcUrl);
    }
    const ana =  this.networkAdapters[network];
    ana.substrateRpc.setUrl(substrateRpcUrl);
    ana.url.next(substrateRpcUrl);
  }

  reconnectSubstrateRpc(network: string): void {
    const ana = this.networkAdapters['network'];
    if (ana) {
      const url = ana.url.value;
      if (url) {
        const badSubstrateRpcUrls = this.badAdapterUrls[network].substrateRpc;
        badSubstrateRpcUrls.push(url);
        window.localStorage.removeItem(`lastUsedSubstrateRpcUrl-${network}`);
        this.configureSubstrateRpcUrl(network);
        if (ana.registered.value) {
          void ana.substrateRpc.connect();
        } else {
          this.polkadapt.register(ana.substrateRpc);
        }
      }
    }
  }

  async setSubstrateRpcUrl(network: string, url: string): Promise<void> {
    const ana = this.networkAdapters[network];
    if (ana) {
      window.localStorage.setItem(`lastUsedSubstrateRpcUrl-${network}`, url);
      ana.substrateRpc.setUrl(url);
      ana.url.next(url);
      if (ana.registered.value) {
        await ana.substrateRpc.connect();
      } else {
        // Not registered, so let's try this url as well as the others again.
        this.badAdapterUrls[network].substrateRpc.length = 0;
        this.polkadapt.register(ana.substrateRpc);
      }
    }
  }


  forceReconnect(): void {
    for (const network of Object.keys(this.networkAdapters)) {
      this.reconnectSubstrateRpc(network);
    }
  }
}
