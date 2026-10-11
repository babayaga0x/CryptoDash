import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoinService } from '../../core/coin.service';
import { Change } from '../../shared/change';
import { Chart } from '../../shared/chart';
import { UsdPipe } from '../../shared/format';

@Component({
  selector: 'app-overview',
  imports: [RouterLink, DecimalPipe, UsdPipe, Change, Chart],
  templateUrl: './overview.html',
})
export class Overview {
  protected readonly api = inject(CoinService);

  constructor() {
    this.api.loadMarkets();
    this.api.loadGlobal();
  }
}
