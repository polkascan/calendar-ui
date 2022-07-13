import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatestWith, mergeWith, skip, Subject, takeUntil } from 'rxjs';
import { Network, PolkadaptService } from '../../services/polkadapt.service';
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

    for (const [network, control] of this.networkActiveFormControls.entries()) {
      control.valueChanges.pipe(takeUntil(this.destroyer)).subscribe(active => {
        if (active) {
          void this.ns.enableNetwork(network.name);
        } else {
          this.ns.disableNetwork(network.name);
        }
      });
    }

    this.networkForm.controls.active.valueChanges.pipe(takeUntil(this.destroyer)).subscribe(active => {
      const selectedNetwork: Network | null = this.selectedNetwork.value;
      if (selectedNetwork) {
        if (active) {
          void this.ns.enableNetwork(selectedNetwork.name);
        } else {
          this.ns.disableNetwork(selectedNetwork.name);
        }
      }
    });
    this.networkForm.controls.name.valueChanges.pipe(takeUntil(this.destroyer)).subscribe(name => {
      const network: Network = this.selectedNetwork.value!;
      this.ns.setCustomNetwork(network.name, name || '');
      // Nothing actually changes, but we need to trigger the template.
      this.networks.next(this.networks.value);
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  selectNetwork(network: Network): void {
    this.selectedNetwork.next(network);
  }

  connectSelectedNetwork(): void {
    const network: Network | null = this.selectedNetwork.value;
    const url: string | null = this.networkForm.controls.url.value;
    if (network && url) {
      this.pa.setSubstrateRpcUrl(network.name, url).then();
      if (network.isCustom) {
        this.ns.disableNetwork(network.name);
        this.ns.enableNetwork(network.name).then();
      }
    }
  }

  addCustomNetwork(): void {
    const network: Network = this.ns.setCustomNetwork(`custom${new Date().getTime()}`, 'My Custom Network', '');
    this.networks.value.splice(0, 0, network);
    this.networks.next(this.networks.value);
    const control = new FormControl<boolean|null>(true);
    this.networkActiveFormControls.set(network, control);
    control.valueChanges.pipe(takeUntil(this.destroyer)).subscribe(active => {
      if (active) {
        void this.ns.enableNetwork(network.name);
      } else {
        this.ns.disableNetwork(network.name);
      }
    });
    this.selectNetwork(network);
    this.networkForm.controls.active.setValue(true, {emitEvent: false});
  }

  deleteCustomNetwork(network: Network): void {
    if (network === this.selectedNetwork.value) {
      this.selectedNetwork.next(null);
    }
    this.networkActiveFormControls.delete(network);
    let index: number = this.networks.value.indexOf(network);
    if (index > -1) {
      this.networks.value.splice(index, 1);
      this.networks.next(this.networks.value);
    }
    this.ns.deleteCustomNetwork(network.name);
  }
}
