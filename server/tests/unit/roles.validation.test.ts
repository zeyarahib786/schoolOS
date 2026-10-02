import { createAccessRoleSchema, updatePermissionSchema } from '../../src/modules/roles/roles.validation';

describe('roles validation', () => {
  it('accepts a legitimate custom role and trims its fields', () => {
    const parsed = createAccessRoleSchema.parse({
      body: { name: '  Librarian  ', basedOn: 'Teacher', description: '  Library access  ' },
    });
    expect(parsed.body).toEqual({ name: 'Librarian', basedOn: 'Teacher', description: 'Library access' });
  });

  it('requires a supported module and a real boolean permission value', () => {
    expect(() =>
      updatePermissionSchema.parse({ params: { id: 'a'.repeat(24), module: 'Payroll' }, body: { enabled: false } }),
    ).not.toThrow();
    expect(() =>
      updatePermissionSchema.parse({ params: { id: 'a'.repeat(24), module: 'Unknown' }, body: { enabled: true } }),
    ).toThrow();
    expect(() =>
      updatePermissionSchema.parse({ params: { id: 'a'.repeat(24), module: 'Payroll' }, body: { enabled: 'yes' } }),
    ).toThrow();
  });
});
