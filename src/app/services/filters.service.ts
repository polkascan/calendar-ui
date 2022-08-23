import { Injectable } from '@angular/core';
import { CalendarService } from './calendar.service';

@Injectable({providedIn: 'root'})
export class FiltersService {
  networkStorageName = 'calendarNetworkFilter';
  hiddenNetworks: string[];

  constructor(private cal: CalendarService) {
    this.hiddenNetworks = JSON.parse(localStorage.getItem(this.networkStorageName) || '[]');
  }

  toggleNetworkVisibility(name: string): void {
    const index = this.hiddenNetworks.indexOf(name);
    if (index === -1) {
      this.hiddenNetworks.push(name);
    } else {
      this.removeHiddenNetwork(name);
    }
    this.setNetworkFilter();
  }

  removeHiddenNetwork(name: string): void {
    this.hiddenNetworks = this.hiddenNetworks.filter((n: string) => n !== name);
    this.setNetworkFilter();
  }

  resetNetworkFilter(): void {
    this.hiddenNetworks = [];
    this.setNetworkFilter();
  }

  setNetworkFilter(): void {
    if (this.hiddenNetworks.length) {
      localStorage.setItem(this.networkStorageName, JSON.stringify(this.hiddenNetworks));
      this.cal.setFilter('network', (item) => {
        return !this.hiddenNetworks.includes(item.network.name);
      });
    } else {
      localStorage.removeItem(this.networkStorageName);
      this.cal.removeFilter('network');
    }
  }
}
