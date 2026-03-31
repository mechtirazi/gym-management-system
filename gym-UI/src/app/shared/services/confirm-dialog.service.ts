import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private dialog = inject(MatDialog);

  open(data: ConfirmDialogData, width: string = '450px'): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width,
      disableClose: true,
      data
    });

    return dialogRef.afterClosed();
  }
}
