import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar';
import { HeaderComponent } from './header/header';

@Component({
  selector: 'app-private-layout',
  template: `
    <div class="private-layout" [class.sidebar-open]="sidebarOpen()">
      <app-sidebar [open]="sidebarOpen()" (backdropClick)="sidebarOpen.set(false)" />
      <div class="main-area">
        <app-header
          nombre="Analista"
          iniciales="AD"
          (toggleMenu)="toggleSidebar()"
        />
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './private-layout.scss',
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
})
export class PrivateLayout {
  readonly sidebarOpen = signal(window.innerWidth > 768);

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }
}
