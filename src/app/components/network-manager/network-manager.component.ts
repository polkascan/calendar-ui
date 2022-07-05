import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatestWith, mergeWith, skip, Subject, takeUntil } from 'rxjs';
import { PolkadaptService, Network } from '../../services/polkadapt.service';
import { Adapter } from '@polkadapt/substrate-rpc';
import { FormControl, FormGroup } from '@angular/forms';
import { NetworkService } from '../../services/network.service';


@Component({
  selector: 'app-network-manager',
  templateUrl: './network-manager.component.html',
  styleUrls: ['./network-manager.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkManager implements OnInit, OnDestroy {
  destroyer = new Subject<void>();
  networks = new BehaviorSubject<Network[]>([]);
  customNetworks = new BehaviorSubject<Network[]>([]);
  networkActiveFormControls = new Map<Network, FormControl<boolean|null>>();
  selectedNetwork = new BehaviorSubject<Network | null>(null);
  networkForm = new FormGroup({
    name: new FormControl<string|null>(null),
    active: new FormControl<boolean>(true),
    url: new FormControl<string|null>(null),
  });

  constructor(
    private ns: NetworkService,
    private pa: PolkadaptService
  ) { }

  ngOnInit(): void {
    const networks: Network[] = Object.values(this.pa.networks).sort(
      (a, b) => (a.config.name > b.config.name) ? 1 : (a.config.name < b.config.name) ? -1 : 0
    );
    this.networks.next(networks);
    for (const n of networks) {
      this.networkActiveFormControls.set(n, new FormControl<boolean|null>(n.config.defaultActive || false));
    }
    this.ns.activeNetworks.pipe(
      takeUntil(this.destroyer),
      combineLatestWith(this.selectedNetwork)
    ).subscribe(([activeNetworks, selectedNetwork]) => {
      for (const [network, control] of this.networkActiveFormControls.entries()) {
        const isActive: boolean = activeNetworks.includes(network);
        control.reset(isActive, {emitEvent: false});
        if (network === selectedNetwork) {
          // If activeNetworks changed, we can now update the form value.
          this.networkForm.controls.active.reset(isActive, {emitEvent: false})
        }
      }
    });

    this.selectedNetwork.pipe(
      takeUntil(this.destroyer),
    ).subscribe(network => {
      if (network) {
        this.networkForm.controls.name.reset(network.config.name, {emitEvent: false});
        // We only reset the name (for a custom network). The 'active' control is reset in the activeNetworks
        // subscription and the 'url' control is reset by the subscription below.
        network.url.pipe(
          // Without the 'skip' operator, takeUntil would be triggered immediately by the BehaviorSubject's initial
          // emission, and the subscription couldn't continue monitoring outside changes to this network's url.
          takeUntil(this.selectedNetwork.pipe(skip(1), mergeWith(this.destroyer))),
        ).subscribe(url => {
          this.networkForm.controls.url.reset(url, {emitEvent: false});
        });
      }
    });

    this.networkForm.controls.active.valueChanges.subscribe(active => {
      const selectedNetwork: Network | null = this.selectedNetwork.value;
      if (selectedNetwork) {
        const networkName: string = selectedNetwork.substrateRpc.chain;
        if (active) {
          this.ns.enableNetwork(networkName).then();
        } else {
          this.ns.disableNetwork(networkName);
        }
        this.networkActiveFormControls.get(selectedNetwork)!.reset(active, {emitEvent: false});
      }
    });
    this.networkForm.controls.url.valueChanges.subscribe(url => {});
    this.networkForm.controls.name.valueChanges.subscribe(name => {});
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  selectNetwork(network: Network): void {
    this.selectedNetwork.next(network);
  }

  selectUrl(): void {

  }

  addCustomNetwork(): void {
    const network: Network = {
      connected: new BehaviorSubject<boolean>(false),
      registered: new BehaviorSubject<boolean>(false),
      substrateRpc: new Adapter({
        chain: 'custom' + Math.round(Math.random() * 1000000),
      }),
      config: {
        name: 'My Custom Network',
        substrateRpcUrls: {},
      },
      url: new BehaviorSubject<string>(''),
      urls: new BehaviorSubject<string[]>([]),
    };
    this.customNetworks.value.push(network);
    this.customNetworks.next(this.customNetworks.value);
    this.selectNetwork(network);
  }

  deleteCustomNetwork(network: Network): void {
    if (network === this.selectedNetwork.value) {
      this.selectedNetwork.next(null);
    }
    const index: number = this.customNetworks.value.indexOf(network);
    if (index > -1) {
      this.customNetworks.value.splice(index, 1);
      this.customNetworks.next(this.customNetworks.value);
    }
  }

}
