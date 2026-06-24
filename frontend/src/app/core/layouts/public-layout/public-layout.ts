import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LogoComponent } from '../../../shared/components/logo/logo';

@Component({
  selector: 'app-public-layout',
  template: `
    <div class="public-layout">
      <header class="public-header">
        <app-logo />
        <nav class="public-nav">
          <a routerLink="/solicitar" class="nav-link" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Solicitar crédito</a>
          <a routerLink="/analista" class="nav-link">Panel Analista</a>
          <a routerLink="/inversores" class="nav-link">Inversores</a>
          <a routerLink="/educacion" class="nav-link">Educación</a>
          <a routerLink="/admin/auditoria" class="nav-link">Auditoría</a>
        </nav>
      </header>
      <main class="public-content">
        <router-outlet />
      </main>
    </div>
  `,
  styleUrl: './public-layout.scss',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LogoComponent],
})
export class PublicLayout {}
