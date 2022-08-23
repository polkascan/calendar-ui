import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NetworkManagerComponent } from '../network-manager/network-manager.component';
import { MatDialog } from '@angular/material/dialog';
import { NetworkService } from '../../services/network.service';
import { CalendarService } from '../../services/calendar.service';
import { FiltersService } from '../../services/filters.service';

@Component({
  selector: 'app-network-filter',
  templateUrl: './network-filter.component.html',
  styleUrls: ['./network-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkFilterComponent {
  panelOpenState = true;

  constructor(public ns: NetworkService,
              public dialog: MatDialog,
              public fs: FiltersService,
              private cal: CalendarService,
              private cd: ChangeDetectorRef) {
  }

  openNetworkManager(): void {
    this.dialog.open(NetworkManagerComponent, {maxWidth: '100vw'});
  }
}
