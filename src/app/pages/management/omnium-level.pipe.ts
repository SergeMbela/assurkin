// Créez un fichier omnium-level.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'omniumLevel',
  standalone: true
})
export class OmniumLevelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (value === 'partiel') {
      return 'Mini Omnium';
    }
    if (value === 'total') {
      return 'Omnium Complète';
    }
    return 'Aucune';
  }
}
