import { Component, input, output } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-header',
  template: `
    <header class="header">
      <button class="menu-btn" (click)="toggleMenu.emit()">
        <i class="bx bx-menu" style="font-size: 1.5rem"></i>
      </button>
      <div class="header-right">
        <span class="user-name">{{ nombre() }}</span>
        <p-avatar [label]="iniciales()" shape="circle" styleClass="avatar" size="large" />
      </div>
    </header>
  `,
  styleUrl: './header.scss',
  imports: [AvatarModule],
})
export class HeaderComponent {
  readonly nombre = input<string>('');
  readonly iniciales = input<string>('');
  readonly toggleMenu = output<void>();
}
