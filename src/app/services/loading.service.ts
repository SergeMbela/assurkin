import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingRequestCount = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  show() {
    this.loadingRequestCount++;
    if (this.loadingRequestCount === 1) {
      this.loadingSubject.next(true);
    }
  }

  hide() {
    if (this.loadingRequestCount > 0) {
      this.loadingRequestCount--;
      if (this.loadingRequestCount === 0) {
        this.loadingSubject.next(false);
      }
    }
  }
}