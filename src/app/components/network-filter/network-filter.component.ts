import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NetworkManagerComponent } from '../network-manager/network-manager.component';
import { MatDialog } from '@angular/material/dialog';
import { NetworkService } from '../../services/network.service';

@Component({
  selector: 'app-network-filter',
  templateUrl: './network-filter.component.html',
  styleUrls: ['./network-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkFilterComponent {
  panelOpenState = true;

  constructor(public ns: NetworkService,
              public dialog: MatDialog) {
  }

  openNetworkManager(): void {
    this.dialog.open(NetworkManagerComponent, {maxWidth: '100vw'});
  }
}
