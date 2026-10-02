import { scopeMessageFilter } from '../../src/modules/messages/messages.ownership';

describe('scopeMessageFilter', () => {
  it('the all box is the bidirectional $or: sender me OR recipient me', () => {
    expect(scopeMessageFilter({}, 'u1', 'all')).toEqual({ $or: [{ sender: 'u1' }, { recipient: 'u1' }] });
  });

  it('inbox narrows to recipient only; sent narrows to sender only', () => {
    expect(scopeMessageFilter({}, 'u1', 'inbox')).toEqual({ recipient: 'u1' });
    expect(scopeMessageFilter({}, 'u1', 'sent')).toEqual({ sender: 'u1' });
  });

  it('there is NO role parameter at all - an Administrator cannot even ASK for a wider view; the function signature is the privacy guarantee', () => {
    // the scope depends only on (userId, box) - this test documents the deliberate absence of
    // any role-based unrestricted branch, unlike every other scoped module in this codebase
    expect(scopeMessageFilter.length).toBe(3);
  });
});
