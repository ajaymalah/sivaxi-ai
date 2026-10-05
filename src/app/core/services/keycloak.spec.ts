import { TestBed } from '@angular/core/testing';
import { Keycloak } from './keycloak';

describe('Keycloak', () => {
  let service: Keycloak;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Keycloak);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
