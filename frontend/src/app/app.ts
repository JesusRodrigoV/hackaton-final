import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  template: `<p-toast /><router-outlet />`,
  imports: [RouterOutlet, ToastModule],
})
export class App {}
