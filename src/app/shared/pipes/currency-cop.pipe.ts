import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyCop', standalone: true })
export class CurrencyCopPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '$0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';

    return '$' + num.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}
