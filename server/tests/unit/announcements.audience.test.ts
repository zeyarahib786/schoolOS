import { visibleAudiencesFor } from '../../src/modules/announcements/announcements.audience';

describe('visibleAudiencesFor', () => {
  it('gives staff roles (including Accountant) full visibility across every audience - staff need to know what has been communicated to whom', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher', 'Accountant'] as const) {
      expect(visibleAudiencesFor(role)).toEqual(['All', 'Staff', 'Parents', 'Students']);
    }
  });

  it('a Parent sees All + Parents, and specifically NOT Staff or Students announcements', () => {
    const audiences = visibleAudiencesFor('Parent');
    expect(audiences).toEqual(['All', 'Parents']);
    expect(audiences).not.toContain('Staff');
    expect(audiences).not.toContain('Students');
  });

  it('a Student sees All + Students, and specifically NOT Staff or Parents announcements', () => {
    const audiences = visibleAudiencesFor('Student');
    expect(audiences).toEqual(['All', 'Students']);
    expect(audiences).not.toContain('Staff');
    expect(audiences).not.toContain('Parents');
  });
});
