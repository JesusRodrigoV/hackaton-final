import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LogoComponent } from '../../../../shared/components/logo/logo';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  template: `
      @if (open() && windowInnerWidth <= 768) {
        <div class="sidebar-backdrop" (click)="backdropClick.emit()"></div>
      }
      <aside class="sidebar" [class.closed]="!open()" [class.overlay]="windowInnerWidth <= 768" (click)="onMenuClick()">
      <div class="sidebar-header">
        <app-logo [link]="false" />
      </div>
      <nav class="sidebar-nav">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: false }"
            class="nav-item"
          >
            <i class="nav-icon bx" [class]="'bx-' + item.icon"></i>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }
      </nav>
    </aside>
  `,
  styleUrl: './sidebar.scss',
  imports: [RouterLink, RouterLinkActive, LogoComponent],
})
export class SidebarComponent {
  readonly open = input.required<boolean>();
  readonly backdropClick = output<void>();

  protected readonly windowInnerWidth = window.innerWidth;

  onMenuClick(): void {
    if (this.windowInnerWidth <= 768) {
      this.backdropClick.emit();
    }
  }

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'grid-alt', route: '/analista' },
    { label: 'Solicitudes', icon: 'file-blank', route: '/analista' },
    { label: 'Cobranza', icon: 'time', route: '/analista/prestamos' },
    { label: 'Inversores', icon: 'trending-up', route: '/inversores' },
    { label: 'Educación', icon: 'book', route: '/educacion' },
    { label: 'Auditoría', icon: 'shield', route: '/admin/auditoria' },
  ];
}
