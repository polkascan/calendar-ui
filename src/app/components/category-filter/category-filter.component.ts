import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';

type Category = [
  string,
  {
    label: string;
    eventTypes: string[];
  }
];

@Component({
  selector: 'app-category-filter',
  templateUrl: './category-filter.component.html',
  styleUrls: ['./category-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFilterComponent implements OnInit {
  filterName = 'categories';
  panelOpenState = true;
  categories: Category[] = [
    ['staking', {label: 'Staking', eventTypes: ['stakingEra', 'stakingEpoch', 'stakingSlash']}],
    ['schedule', {label: 'Schedule', eventTypes: ['scheduler']}],
    ['democracy', {label: 'Democracy', eventTypes: ['democracyDispatch', 'referendumDispatch', 'referendumVote', 'democracyLaunch']}],
    ['parachains', {label: 'Parachains', eventTypes: ['parachainAuction', 'parachainLease']}],
    ['council', {label: 'Council', eventTypes: ['councilMotion', 'councilElection']}],
    ['treasury', {label: 'Treasury', eventTypes: ['treasurySpend']}],
    ['society', {label: 'Society', eventTypes: ['societyRotate', 'societyChallenge']}],
  ];
  categoryFilterForm = new FormGroup({});
  hiddenCategories: string[] = [];

  constructor(private cal: CalendarService) { }

  ngOnInit(): void {
    this.hiddenCategories = JSON.parse(localStorage.getItem('calendarHiddenCategories') || '[]') as string[];
    if (this.hiddenCategories.length) {
      this.setFilter();
    }

    for (const [name] of this.categories) {
      const control = new FormControl<boolean>(!this.hiddenCategories.includes(name));
      this.categoryFilterForm.addControl(name, control);
      control.valueChanges.subscribe(showCategory => {
        if (showCategory) {
          this.hiddenCategories = this.hiddenCategories.filter(c => c !== name);
        } else {
          this.hiddenCategories.push(name);
        }
        localStorage.setItem('calendarHiddenCategories', JSON.stringify(this.hiddenCategories));
        this.setFilter();
      });
    }
  }

  setFilter(): void {
    if (this.hiddenCategories.length) {
      this.cal.setFilter(this.filterName, (item) => {
        const hiddenCategories: Category[] = this.categories.filter(c => this.hiddenCategories.includes(c[0]));
        const hiddenTypes: string[] = hiddenCategories.reduce((prev: string[], cur) => prev.concat(cur[1].eventTypes), []);
        return !hiddenTypes.includes(item.type);
      });
    } else {
      this.cal.removeFilter(this.filterName)
    }
  }
}
