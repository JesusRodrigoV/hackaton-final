import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  template: `
    @if (link()) {
      <a [routerLink]="linkUrl()" class="logo">
        <span class="logo-icon">N</span>
        <span class="logo-text">NeoLend</span>
      </a>
    } @else {
      <div class="logo">
        <span class="logo-icon">N</span>
        <span class="logo-text">NeoLend</span>
      </div>
    }
  `,
  styleUrl: './logo.scss',
  imports: [RouterLink],
})
export class LogoComponent {
  readonly link = input(true);
  readonly linkUrl = input('/');
}
