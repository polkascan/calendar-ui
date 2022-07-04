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
import { HttpClient } from '@angular/common/http';

export type NetworkConfig = {
  [network: string]: RelayChainConfig;
};

export type RelayChainConfig = {
  substrateRpcUrls: { [name: string]: string };
  name: string;
  color: string;
  homepage?: string;
  logo?: string
  parachains?: { [network: string]: ParachainConfig };
};

export type ParachainConfig = RelayChainConfig & {
  paraId: number;
  common?: boolean;
  parachains?: { [network: string]: ParachainConfig };
}

type Config = {
  network: NetworkConfig,
  calendarApiUrlArray: string[];
};

@Injectable()
export class AppConfig {
  networks: NetworkConfig;
  calendar: string[];

  constructor(private readonly http: HttpClient) {
  }

  public load(): Promise<void> {
    return this.http
      .get<Config>('assets/config.json')
      .toPromise()
      .then((config): void => {
        this.networks = config && config.network || {};
        this.calendar = config && config.calendarApiUrlArray || [];
      });
  }
}

export function initConfig(config: AppConfig): () => Promise<void> {
  return () => config.load();
}
