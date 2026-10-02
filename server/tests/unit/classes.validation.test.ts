import { createClassSchema, listClassesSchema } from '../../src/modules/classes/classes.validation';

describe('Classes validation', () => {
  it('normalizes section and supplies operational defaults', () => {
    const parsed = createClassSchema.parse({ body: { grade: 'Grade 4', section: 'b' } });
    expect(parsed.body).toMatchObject({ grade: 'Grade 4', section: 'B', stream: 'General', capacity: 30 });
  });

  it('rejects unsupported grades, sections, and capacities', () => {
    expect(() => createClassSchema.parse({ body: { grade: 'University', section: 'A' } })).toThrow();
    expect(() => createClassSchema.parse({ body: { grade: 'Grade 4', section: 'Z' } })).toThrow();
    expect(() => createClassSchema.parse({ body: { grade: 'Grade 4', section: 'A', capacity: 0 } })).toThrow();
  });

  it('coerces list pagination while enforcing the upper bound', () => {
    expect(listClassesSchema.parse({ query: { page: '2', limit: '50' } }).query).toMatchObject({ page: 2, limit: 50 });
    expect(() => listClassesSchema.parse({ query: { limit: '101' } })).toThrow();
  });
});
