import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-file-upload',
  template: `
    <div
      class="upload-zone"
      [class.dragover]="isDragover()"
      [class.has-file]="file()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
    >
      @if (!file()) {
        <div class="upload-placeholder">
          <i class="bx bx-cloud-upload" style="font-size: 2.5rem; color: var(--p-surface-600)"></i>
          <p class="upload-text">Suba su documento de identidad</p>
          <p class="upload-hint">Arrastre o haga clic para seleccionar</p>
        </div>
      } @else {
        <div class="upload-preview">
          <i class="bx bx-file" style="font-size: 1.5rem; color: var(--p-green-500)"></i>
          <span class="upload-filename">{{ file()?.name }}</span>
          <button class="upload-remove" (click)="removeFile($event)" type="button">×</button>
        </div>
      }
      <input
        #fileInput
        type="file"
        accept="image/*,.pdf"
        (change)="onFileSelected($event)"
        class="hidden-input"
      />
    </div>
  `,
  styleUrl: './file-upload.scss',
})
export class FileUploadComponent {
  readonly fileChange = output<File | null>();

  readonly file = signal<File | null>(null);
  readonly isDragover = signal(false);

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragover.set(true);
  }

  onDragLeave(): void {
    this.isDragover.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragover.set(false);
    const f = e.dataTransfer?.files[0];
    if (f) this.setFile(f);
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.setFile(f);
  }

  removeFile(e: MouseEvent): void {
    e.stopPropagation();
    this.setFile(null);
  }

  private setFile(f: File | null): void {
    this.file.set(f);
    this.fileChange.emit(f);
  }
}
