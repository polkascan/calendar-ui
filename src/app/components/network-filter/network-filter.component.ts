import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NetworkManagerComponent } from '../network-manager/network-manager.component';
import { MatDialog } from '@angular/material/dialog';
import { NetworkService } from '../../services/network.service';
import { CalendarService } from '../../services/calendar.service';

@Component({
  selector: 'app-network-filter',
  templateUrl: './network-filter.component.html',
  styleUrls: ['./network-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkFilterComponent implements OnInit {
  filterName = 'network';
  panelOpenState = true;
  hiddenNetworks: string[] = [];

  constructor(public ns: NetworkService,
              public dialog: MatDialog,
              private cal: CalendarService,
              private cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    // Load initial settings for hidden networks.
    this.ns.activeNetworks.subscribe(() => {
      const storedHiddenNetworks = localStorage[`calendarNetworkFilter`];
      if (storedHiddenNetworks) {
        this.hiddenNetworks = storedHiddenNetworks;
        this.setFilter();
        this.cd.markForCheck();
      }
    });
  }

  openNetworkManager(): void {
    this.dialog.open(NetworkManagerComponent, {maxWidth: '100vw'});
  }

  toggleNetworkVisibility(name: string): void {
    const index = this.hiddenNetworks.indexOf(name);
    if (index === -1) {
      this.hiddenNetworks.push(name);
    } else {
      this.hiddenNetworks = this.hiddenNetworks.filter((n) => n !== name);
    }

    localStorage['calendarNetworkFilter'] = this.hiddenNetworks;
    this.setFilter();
  }

  resetFilter(): void {
    this.hiddenNetworks = [];
    localStorage.removeItem('calendarNetworkFilter');
    this.setFilter();
  }

  setFilter(): void {
    if (this.hiddenNetworks.length) {
      this.cal.setFilter(this.filterName, (item) => {
        return !this.hiddenNetworks.includes(item.network.name);
      });
    } else {
      this.cal.removeFilter(this.filterName)
    }
  }
}
