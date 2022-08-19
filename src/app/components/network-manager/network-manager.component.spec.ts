import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkManagerComponent } from './network-manager.component';

describe('ChainManagerComponent', () => {
  let component: NetworkManagerComponent;
  let fixture: ComponentFixture<NetworkManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NetworkManagerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NetworkManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
