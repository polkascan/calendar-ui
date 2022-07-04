import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PolkadaptService, Network } from '../../services/polkadapt.service';
import { Adapter } from '@polkadapt/substrate-rpc';
import { FormControl, FormGroup } from '@angular/forms';


@Component({
  selector: 'app-network-manager',
  templateUrl: './network-manager.component.html',
  styleUrls: ['./network-manager.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkManager implements OnInit {
  networks = new BehaviorSubject<Network[]>([]);
  customNetworks = new BehaviorSubject<Network[]>([]);
  networkActiveFormControls = new Map<Network, FormControl<boolean|null>>();
  selectedNetwork = new BehaviorSubject<Network | null>(null);
  networkForm = new FormGroup({
    name: new FormControl<string|null>(null),
    showNetwork: new FormControl<boolean>(true),
    url: new FormControl<string|null>(null),
  });

  constructor(private pa: PolkadaptService) { }

  ngOnInit(): void {
    const networks: Network[] = Object.values(this.pa.networkAdapters).sort(
      (a, b) => (a.config.name > b.config.name) ? 1 : (a.config.name < b.config.name) ? -1 : 0
    );
    this.networks.next(networks);
    for (const n of networks) {
      this.networkActiveFormControls.set(n, new FormControl<boolean|null>(n.config.defaultActive || false));
    }
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
