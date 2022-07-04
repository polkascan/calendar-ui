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
import { PolkadaptService } from './polkadapt.service';
import { BehaviorSubject, filter, map, Subject } from 'rxjs';
import type { Option, u32 } from '@polkadot/types';
import type { ITuple } from '@polkadot/types/types';
import {
  BlockNumber,
  EraIndex,
  Header,
  LeasePeriod,
  LeasePeriodOf,
  ReferendumStatus,
  Scheduled,
  UnappliedSlash
} from '@polkadot/types/interfaces';
import { QueryableModuleConsts } from '@polkadot/api/types';
import type { DeriveCollectiveProposal } from '@polkadot/api-derive/types';
import { PjsCalendarItem, PjsCalendarItemDuration } from '../pages/types';

export const defaultBlockTime = 6000;

type ChainConsts = {
  blockTime?: number;
}

export type CalenderItemsPerChain = Map<string, PjsCalendarItem[]>;


@Injectable({
  providedIn: "root"
})
export class PolkadotJsScheduledService {
  newHeads: Map<string, BehaviorSubject<Header | null>> = new Map();
  chainConstsPerChain: Map<string, ChainConsts> = new Map();
  calendarItemsPerChain: CalenderItemsPerChain = new Map();
  dataChanged = new Subject<CalenderItemsPerChain>();

  reloadAtBlockHeight: Map<string, number> = new Map();

  private loading: Map<string, BehaviorSubject<boolean>> = new Map();
  private unsubscribeFns: Map<string, () => void> = new Map();

  constructor(private pa: PolkadaptService) {
  }

  async initialize(): Promise<void> {
    const networks = Object.keys(this.pa.networkAdapters);
    await Promise.allSettled(networks.map((n) => this.initializeChain(n)));
  }

  async initializeChain(network: string): Promise<void> {
    const bs = new BehaviorSubject<Header | null>(null);
    const unsubFn = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).rpc.chain.subscribeNewHeads(
      (header: Header) => bs.next(header)
    );
    this.newHeads.set(network, bs);
    this.unsubscribeFns.set(network, unsubFn);
    this.loading.set(network, new BehaviorSubject<boolean>(false));

    await this.prefetchChainConsts(network);

    const fetchData = async (blockNumber: number): Promise<void> => {
      const loading = this.loading.get(network) as BehaviorSubject<boolean>;
      if (loading && loading.getValue()) {
        return;
      }

      loading.next(true);

      if (!this.reloadAtBlockHeight.has(network) || blockNumber >= (this.reloadAtBlockHeight.get(network) as number)) {
        // Reset the reload at block height to prevent Math.min to reuse the current value as lowest value.
        this.reloadAtBlockHeight.delete(network);
        // Reset calendarItems
        this.calendarItemsPerChain.set(network, []);

        await Promise.allSettled([
          this.fetchActionInfo(network, blockNumber),
          this.fetchCouncilMotions(network, blockNumber),
          this.fetchDemocracyDispatches(network, blockNumber),
          this.fetchReferendums(network, blockNumber),
          this.fetchStakingInfo(network, blockNumber),
          this.fetchScheduled(network, blockNumber),
          this.fetchCouncilElection(network, blockNumber),
          this.fetchDemocracyLaunch(network, blockNumber),
          this.fetchTreasurySpend(network, blockNumber),
          this.fetchSocietyRotate(network, blockNumber),
          this.fetchSocietyChallenge(network, blockNumber),
          this.fetchParachainLease(network, blockNumber)
        ]);

        loading.next(false);
        this.dataChanged.next(this.calendarItemsPerChain);
      }
    }

    bs.pipe(
      filter((head): head is Header => !!head),
      map<Header, number>((head) => {
        return head.number.toNumber();
      })
    ).subscribe((v) => {
      const reloadAt = this.reloadAtBlockHeight.get(network);
      if (reloadAt && reloadAt < v) {
        // No need to update when there is no change expected.
        return;
      }
      void fetchData(v)
    });
  }

  destroy(): void {
    this.newHeads.forEach((bs) => bs.complete());
    this.newHeads.clear();
    this.unsubscribeFns.forEach((fn) => fn());
    this.unsubscribeFns.clear();
  }

  getNewHeads(network: string): BehaviorSubject<Header | null> | undefined {
    return this.newHeads.get(network);
  }

  getBlockTime(network: string): number {
    const chainInfo = this.chainConstsPerChain.get(network);
    return chainInfo?.blockTime || defaultBlockTime;
  }

  generateCalendarItemDuration(network: string, blockNumber: number, duration: number, offset = 0): PjsCalendarItemDuration | void {
    const blockTime = this.getBlockTime(network);

    if (blockNumber >= 0) {
      const modifiedBlockNumber = blockNumber - offset;
      const blocksSpent = modifiedBlockNumber % duration;
      const blocksLeft = duration - blocksSpent;
      const startBlockNumber = modifiedBlockNumber - blocksSpent;
      const endBlockNumber = modifiedBlockNumber + blocksLeft;
      const timeSpent = blocksSpent * blockTime;
      const timeLeft = blocksLeft * blockTime;
      const startTimestamp = +(new Date()) - timeSpent;
      const endTimestamp = +(new Date()) + timeLeft;

      return {
        startDate: new Date(startTimestamp),
        endDate: new Date(endTimestamp),
        startBlockNumber,
        endBlockNumber,
        duration
      }
    }
  }

  async prefetchChainConsts(network: string): Promise<void> {
    const consts: ChainConsts = {};
    this.chainConstsPerChain.set(network, consts);

    // For now we are only interested in Polkadot and Kusama. Therefor we fetch the blockTime from Babe.
    const blockTimes = await Promise.allSettled([
      this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.babe.expectedBlockTime,
      this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.difficulty.targetBlockTime,
      this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.subspace.expectedBlockTime
    ]);
    const blockTime = blockTimes.find(result => result.status === 'fulfilled' && !!(result as PromiseFulfilledResult<u32>).value
    ) as PromiseFulfilledResult<u32> | undefined;
    if (blockTime?.value) {
      consts.blockTime = Math.min(blockTime.value.toJSON() as number, 24 * 60 * 60 * 1000); // Max a day.
    } else {
      try {
        const minPeriod = (await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.timestamp.minimumPeriod).toJSON() as number;
        if (minPeriod && minPeriod >= 500) {
          consts.blockTime = minPeriod * 2;
        }
      } catch (e) {
        try {
          if (await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).query.parachainSystem) {
            consts.blockTime = defaultBlockTime * 2;
          }
        } catch (e) {
          console.error(`${network}: Couldn't determine block time from on-chain data, falling back to default.`);
        }
      }
    }
  }

  async fetchActionInfo(network: string, blockNumber: number): Promise<void> {
    // End of auction period and calculated start.
    // Jaco:  End of the current parachain auction

    const blockTime = this.getBlockTime(network);
    const endingPeriod = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.auctions.endingPeriod as u32;
    const leasePeriodPerSlot = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.auctions.leasePeriodsPerSlot as BlockNumber;
    const auctionInfo = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).query.auctions.auctionInfo() as Option<ITuple<[LeasePeriodOf, BlockNumber]>>;

    if (auctionInfo && auctionInfo.isSome) {
      const [leasePeriod, endBlock] = auctionInfo.unwrap();

      const startBlockNumber = endBlock.toJSON() - endingPeriod.toJSON();
      const endBlockNumber = endBlock.toJSON() as number;
      const startTimestamp = +(new Date()) + (blockTime * (startBlockNumber - blockNumber));
      const endTimestamp = +(new Date()) + (blockTime * (endBlockNumber - blockNumber));

      const item: PjsCalendarItem = {
        network,
        type: 'parachainAuction',
        startDate: new Date(startTimestamp),
        endDate: new Date(endTimestamp),
        startBlockNumber,
        endBlockNumber,
        data: {
          leasePeriod: leasePeriod.toJSON() as number,
          leasePeriodPerSlot: leasePeriodPerSlot.toJSON() as number || 3
        }
      }
      this.addCalendarItem(network, item);
    }
  }

  async fetchCouncilMotions(network: string, blockNumber: number): Promise<void> {
    // Jaco:  Voting ends on council motion {{id}}

    const blockTime = this.getBlockTime(network);
    const councilMotions: DeriveCollectiveProposal[] = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).derive.council.proposals();

    if (councilMotions) {
      councilMotions.forEach(({hash, votes}) => {
        if (votes) {
          const endBlockNumber = votes.end.toJSON() as number;
          const endTimestamp = +(new Date()) + (blockTime * (endBlockNumber - blockNumber));

          const item: PjsCalendarItem = {
            network,
            type: 'councilMotion',
            endDate: new Date(endTimestamp),
            endBlockNumber,
            data: {
              hash: hash.toHex(),
              votes: votes
            }
          }
          this.addCalendarItem(network, item);
        }
      })
    }
  }

  async fetchDemocracyDispatches(network: string, blockNumber: number): Promise<void> {
    // Jaco:  'Enactment of the result of referendum {{}}'

    const blockTime = this.getBlockTime(network);
    const dispatches = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).derive.democracy.dispatchQueue();

    if (dispatches) {
      dispatches.forEach(({at, index}) => {
        const endBlockNumber = at.toJSON() as number;
        const endTimestamp = +(new Date()) + (blockTime * (endBlockNumber - blockNumber));

        const item: PjsCalendarItem = {
          network,
          type: 'democracyDispatch',
          endDate: new Date(endTimestamp),
          endBlockNumber,
          data: {
            index: index.toJSON() as number,
          }
        }
        this.addCalendarItem(network, item);
      })
    }
  }

  async fetchReferendums(network: string, blockNumber: number): Promise<void> {
    // JACO: referendumDispatch  'Potential dispatch of referendum (if passed)'
    // JACO: referendumVote  Voting ends for referendum'

    const blockTime = this.getBlockTime(network);
    const referendums = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).derive.democracy.referendums();

    if (referendums) {
      referendums.forEach(({index, status}) => {
        const endBlock = (status as ReferendumStatus).end.toJSON() as number;

        const referendumEndTimestamp = +(new Date()) + (blockTime * (endBlock - blockNumber));
        const enactEndBlock = endBlock + ((status as ReferendumStatus).delay.toJSON() as number);
        const enactEndTimestamp = +(new Date()) + (blockTime * (enactEndBlock - blockNumber));
        const voteEndBlock = endBlock - 1;
        const voteEndTimestamp = +(new Date()) + (blockTime * (voteEndBlock - blockNumber));

        const enactItem: PjsCalendarItem = {
          network,
          type: 'referendumDispatch',
          endBlockNumber: enactEndBlock,
          endDate: new Date(enactEndTimestamp),
          data: {
            index,
            referendum: {
              endDate: new Date(referendumEndTimestamp),
              endBlock: endBlock
            },
          }
        }
        this.addCalendarItem(network, enactItem);

        const voteItem: PjsCalendarItem = {
          network,
          type: 'referendumVote',
          endBlockNumber: voteEndBlock,
          endDate: new Date(voteEndTimestamp),
          data: {
            index,
            isPending: true,
            referendum: {
              endDate: new Date(referendumEndTimestamp),
              endBlock: endBlock
            },
          }
        }
        this.addCalendarItem(network, voteItem);
      })
    }
  }

  async fetchStakingInfo(network: string, blockNumber: number): Promise<void> {
    // JACO:  stakingEpoch   Start of a new staking session
    // JACO:  stakingEra     Start of a new staking era
    // JACO:  stakingSlash   Application of slashes from era

    const blockTime = this.getBlockTime(network);
    const sessionInfo = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).derive.session.progress();

    if (sessionInfo) {
      const sessionLength = sessionInfo.sessionLength.toJSON() as number;

      if (sessionLength > 1) {
        const activeEra = sessionInfo.activeEra.toJSON() as number;
        const prevEra = activeEra - 1;
        const nextEra = activeEra + 1;
        const eraLength = sessionInfo.eraLength.toJSON() as number;
        const eraProgress = sessionInfo.eraProgress.toJSON() as number;
        const eraBlocksLeft = eraLength - eraProgress;
        const eraEndBlockNumber = eraBlocksLeft + blockNumber;
        const eraEndTimestamp = +(new Date()) + (blockTime * eraBlocksLeft);

        const eraItem: PjsCalendarItem = {
          network,
          type: 'stakingEra',
          startBlockNumber: eraEndBlockNumber,
          startDate: new Date(eraEndTimestamp),
          data: {
            index: nextEra
          }
        }
        this.addCalendarItem(network, eraItem);

        const sessionProgress = sessionInfo.sessionProgress.toJSON() as number;
        const sessionBlocksLeft = sessionLength - sessionProgress;
        const sessionEndBlockNumber = sessionBlocksLeft + blockNumber;
        const sessionEndTimestamp = +(new Date()) + (blockTime * sessionBlocksLeft);
        const nextSessionIndex = (sessionInfo.currentIndex.toJSON() as number) + 1;

        const epochItem: PjsCalendarItem = {
          network,
          type: 'stakingEpoch',
          endBlockNumber: sessionEndBlockNumber,
          endDate: new Date(sessionEndTimestamp),
          data: {
            index: nextSessionIndex,
          }
        }
        this.addCalendarItem(network, epochItem);

        let slashDeferDuration: number | undefined;
        let slashDuration: number | undefined;

        try {
          slashDeferDuration = (await Promise.resolve(this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.staking.slashDeferDuration) as u32).toJSON() as number;

          if (slashDeferDuration) {
            slashDuration = slashDeferDuration * eraLength;
          }
        } catch (e) {
          console.error(e);
        }

        if (slashDuration !== undefined) {
          const unappliedSlashes = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).query.staking.unappliedSlashes.entries() as [{ args: [EraIndex] }, UnappliedSlash[]][];
          if (unappliedSlashes) {
            unappliedSlashes.forEach(([{args}, values]) => {
              if (values.length) {
                const slashEraIndex = args[0].toJSON() as number;
                const slashBlocksProgress = ((prevEra - slashEraIndex) * eraLength) + eraProgress;
                const slashBlocksLeft = (slashDuration as number) - slashBlocksProgress;
                const slashEndBlockNumber = slashBlocksLeft + blockNumber;
                const slashEndTimestamp = +(new Date()) + (blockTime * slashBlocksLeft);

                const slashItem: PjsCalendarItem = {
                  network,
                  type: 'stakingSlash',
                  endBlockNumber: slashEndBlockNumber,
                  endDate: new Date(slashEndTimestamp),
                  data: {
                    index: slashEraIndex
                  }
                };
                this.addCalendarItem(network, slashItem);
              }
            });
          }
        }
      }
    }
  }

  async fetchScheduled(network: string, blockNumber: number): Promise<void> {
    const blockTime = this.getBlockTime(network);

    const scheduled = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).query.scheduler.agenda.entries() as [{ args: [BlockNumber] }, Option<Scheduled>[]][];

    if (scheduled) {
      scheduled.forEach(([key, scheduledOptions]) => {
        const scheduledBlockNumber = key.args[0].toJSON() as number;
        const blocksLeft = scheduledBlockNumber - blockNumber;
        const endTimestamp = +(new Date()) + (blockTime * blocksLeft);

        scheduledOptions
          .map((scheduledOption) => scheduledOption.unwrap())
          .forEach(({maybeId}) => {
            const idOrNull = maybeId.unwrapOr(null);
            const id = idOrNull ? idOrNull.isAscii ? idOrNull.toUtf8() : idOrNull.toHex() : null;

            const item: PjsCalendarItem = {
              network,
              type: 'scheduler',
              endBlockNumber: scheduledBlockNumber,
              endDate: new Date(endTimestamp),
              data: {
                id
              }
            };
            this.addCalendarItem(network, item);
          });
      })
    }
  }

  async fetchCouncilElection(network: string, blockNumber: number): Promise<void> {
    const responses = await Promise.allSettled([
      this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.elections,
      this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.phragmenElection,
      this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.electionsPhragmen
    ]);
    const response = responses.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<QueryableModuleConsts>;
    if (!response) {
      return;
    }

    const duration = response.value.termDuration as u32;

    const itemDuration = this.generateCalendarItemDuration(network, blockNumber, duration.toJSON() as number);

    if (itemDuration && itemDuration.endBlockNumber) {
      if (itemDuration.endBlockNumber) {
        this.setLowestBlockHeight(network, itemDuration.endBlockNumber, blockNumber);
      }

      const item: PjsCalendarItem = Object.assign({
        network: network,
        type: 'councilElection',
        data: {
          electionRound: Math.floor((itemDuration.startBlockNumber as number) / (itemDuration.duration as number))
        }
      }, itemDuration);

      this.addCalendarItem(network, item);
    }
  }

  async fetchDemocracyLaunch(network: string, blockNumber: number): Promise<void> {
    const duration = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.democracy.launchPeriod as u32;
    const itemDuration = this.generateCalendarItemDuration(network, blockNumber, duration.toJSON() as number);

    if (itemDuration && itemDuration.endBlockNumber) {
      if (itemDuration.endBlockNumber) {
        this.setLowestBlockHeight(network, itemDuration.endBlockNumber, blockNumber);
      }

      const item: PjsCalendarItem = Object.assign({
        network: network,
        type: 'democracyLaunch',
        data: {
          launchPeriod: Math.floor((itemDuration.startBlockNumber as number) / (itemDuration.duration as number))
        }
      }, itemDuration);

      this.addCalendarItem(network, item);
    }
  }

  async fetchTreasurySpend(network: string, blockNumber: number): Promise<void> {
    const duration = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.treasury.spendPeriod as u32;
    const itemDuration = this.generateCalendarItemDuration(network, blockNumber, duration.toJSON() as number);

    if (itemDuration && itemDuration.endBlockNumber) {
      if (itemDuration.endBlockNumber) {
        this.setLowestBlockHeight(network, itemDuration.endBlockNumber, blockNumber);
      }

      const item: PjsCalendarItem = Object.assign({
        network: network,
        type: 'treasurySpend',
        data: {
          spendingPeriod: Math.floor((itemDuration.startBlockNumber as number) / (itemDuration.duration as number))
        }
      }, itemDuration);

      this.addCalendarItem(network, item);
    }
  }

  async fetchSocietyRotate(network: string, blockNumber: number): Promise<void> {
    const duration = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.society.rotationPeriod as u32;
    const itemDuration = this.generateCalendarItemDuration(network, blockNumber, duration.toJSON() as number);

    if (itemDuration) {
      if (itemDuration.endBlockNumber) {
        this.setLowestBlockHeight(network, itemDuration.endBlockNumber, blockNumber);
      }

      const item: PjsCalendarItem = Object.assign({
        network: network,
        type: 'societyRotate',
        data: {
          rotateRound: Math.floor((itemDuration.startBlockNumber as number) / (itemDuration.duration as number))
        }
      }, itemDuration);

      this.addCalendarItem(network, item);
    }
  }

  async fetchSocietyChallenge(network: string, blockNumber: number): Promise<void> {
    const duration = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.society.challengePeriod as u32;
    const itemDuration = this.generateCalendarItemDuration(network, blockNumber, duration.toJSON() as number);

    if (itemDuration && itemDuration.endBlockNumber) {
      if (itemDuration.endBlockNumber) {
        this.setLowestBlockHeight(network, itemDuration.endBlockNumber, blockNumber);
      }

      const item: PjsCalendarItem = Object.assign({
        network: network,
        type: 'societyChallenge',
        data: {
          challengePeriod: Math.floor((itemDuration.startBlockNumber as number) / (itemDuration.duration as number))
        }
      }, itemDuration);

      this.addCalendarItem(network, item);
    }
  }

  async fetchParachainLease(network: string, blockNumber: number): Promise<void> {
    const duration = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.slots.leasePeriod as LeasePeriod;
    const offset = await this.pa.run({chain: network, adapters: this.pa.networkAdapters[network].substrateRpc}).consts.slots.leaseOffset as u32;
    const itemDuration = this.generateCalendarItemDuration(network, blockNumber, duration.toJSON() as number, offset.toJSON() as number);

    if (itemDuration && itemDuration.endBlockNumber) {
      this.setLowestBlockHeight(network, itemDuration.endBlockNumber, blockNumber);

      const item: PjsCalendarItem = Object.assign({
        network: network,
        type: 'parachainLease',
        data: {
          leasePeriod: Math.floor((itemDuration.startBlockNumber as number) / (itemDuration.duration as number)) + 1
        }
      }, itemDuration);

      this.addCalendarItem(network, item);
    }
  }

  addCalendarItem(network: string, item: PjsCalendarItem): void {
    (this.calendarItemsPerChain.get(network) as PjsCalendarItem[]).push(item);
  }

  setLowestBlockHeight(network: string, blockNumber: number, currentBlockNumber: number) {
    if (Number.isInteger(blockNumber)) {
      const lowest = this.reloadAtBlockHeight.has(network) ? Math.min(this.reloadAtBlockHeight.get(network) as number, blockNumber) : blockNumber;
      this.reloadAtBlockHeight.set(network, Math.max(currentBlockNumber, lowest));
    }
  }
}
