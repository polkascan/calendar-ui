import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { NetworkManagerComponent } from '../network-manager/network-manager.component';
import { MatDialog } from '@angular/material/dialog';
import { NetworkService } from '../../services/network.service';

@Component({
  selector: 'app-network-filter',
  templateUrl: './network-filter.component.html',
  styleUrls: ['./network-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkFilterComponent implements OnInit {
  panelOpenState = true;
  hiddenNetworks: string[] = [];

  constructor(public ns: NetworkService,
              public dialog: MatDialog) {
  }

  ngOnInit(): void {
    // Load initial settings for hidden networks.
    return;
  }

  openNetworkManager(): void {
    this.dialog.open(NetworkManagerComponent, {maxWidth: '100vw'});
  }

  toggleNetworkVisibility(name: string): void {
    const index = this.hiddenNetworks.indexOf(name);
    if (index === -1) {
      this.hiddenNetworks.push(name);
    } else {
      this.hiddenNetworks.splice(1, index);
    }
  }
}
