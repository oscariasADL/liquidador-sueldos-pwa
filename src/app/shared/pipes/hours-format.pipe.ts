import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'hoursFormat', standalone: true })
export class HoursFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '0h';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0h';

    const hours = Math.floor(num);
    const minutes = Math.round((num - hours) * 60);

    if (minutes === 0) return `${hours}h`;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }
}
