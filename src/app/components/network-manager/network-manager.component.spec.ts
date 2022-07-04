import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkManager } from './network-manager.component';

describe('ChainManagerComponent', () => {
  let component: NetworkManager;
  let fixture: ComponentFixture<NetworkManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NetworkManager ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NetworkManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
