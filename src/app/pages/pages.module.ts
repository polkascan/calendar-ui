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

import { Injectable, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PagesRoutingModule } from './pages-routing.module';
import { PagesComponent } from './pages.component';
import { DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule, MatOptionModule, NativeDateAdapter } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NetworkManagerComponent } from '../components/network-manager/network-manager.component';
import { NetworkFilterComponent } from '../components/network-filter/network-filter.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CategoryFilterComponent } from '../components/category-filter/category-filter.component';


@Injectable()
class MondayFirstDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }
}


@NgModule({
  declarations: [
    PagesComponent,
    NetworkManagerComponent,
    NetworkFilterComponent,
    CategoryFilterComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PagesRoutingModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatOptionModule,
    MatSelectModule,
    MatExpansionModule
  ],
  providers: [
    {provide: MAT_DATE_LOCALE, useValue: 'en-GB'},
    {provide: DateAdapter, useClass: MondayFirstDateAdapter},
  ]
})
export class PagesModule { }
