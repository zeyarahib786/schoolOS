import { describe, expect, it } from '@jest/globals';
import { generateStudentTranslations, translateFullName } from '../../src/utils/multilingual';

describe('Personal name transliteration', () => {
  it('avoids a duplicate Arabic article and preserves original names', () => {
    expect(translateFullName('Fatima Al Hashimi', 'ar')).toBe('فاطمة الهاشمي');
    const result = generateStudentTranslations('Fatima Al Hashimi', 'Khalid Al Hashimi');
    expect(result.en.name).toBe('Fatima Al Hashimi');
    expect(result.en.guardianName).toBe('Khalid Al Hashimi');
    expect(result.ar.guardianName).toBe('خالد الهاشمي');
  });
  it('preserves existing Arabic spelling and handles empty names', () => {
    expect(translateFullName('فاطمة الهاشمي', 'ar')).toBe('فاطمة الهاشمي');
    expect(translateFullName('', 'ar')).toBe('');
  });
});
