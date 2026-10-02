import { overview } from '../../src/modules/reports/reports.service';

describe('reports.service overview role gate', () => {
  it('rejects every role except Administrator and Principal - the sub-WRITE_ROLES subset applied to a READ for the first time', () => {
    for (const role of ['Teacher', 'Accountant', 'Parent', 'Student'] as const) {
      expect(() => overview(role)).toThrow('Only Administrator or Principal may view school reports');
    }
  });
});
