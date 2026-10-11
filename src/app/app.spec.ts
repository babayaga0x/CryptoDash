import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders the brand', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const brand = (fixture.nativeElement as HTMLElement).querySelector('.brand');
    expect(brand?.textContent).toContain('Dash');
  });
});
