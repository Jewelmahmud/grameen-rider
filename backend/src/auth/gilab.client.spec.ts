import { flattenGilabError, normaliseBdPhone } from './gilab.client';

describe('flattenGilabError', () => {
  it('lifts GiLab nested error code and message to the top level', () => {
    expect(
      flattenGilabError({ success: false, error: { code: 'VERIFICATION_REQUIRED', message: 'Verify your phone', statusCode: 401 } }),
    ).toEqual({ code: 'VERIFICATION_REQUIRED', message: 'Verify your phone' });
  });

  it('keeps flat bodies and validation details', () => {
    expect(flattenGilabError({ code: 'USER_EXISTS', message: 'Already registered', errors: [{ field: 'phone' }] })).toEqual({
      code: 'USER_EXISTS',
      message: 'Already registered',
      details: [{ field: 'phone' }],
    });
  });

  it('falls back to a generic message', () => {
    expect(flattenGilabError(undefined)).toBe('Auth server error');
    expect(flattenGilabError('Bad gateway')).toBe('Bad gateway');
    expect(flattenGilabError({ success: false })).toEqual({ message: 'Auth server error' });
  });
});

describe('normaliseBdPhone', () => {
  it('turns +880 and 880 into the local 0 prefix', () => {
    expect(normaliseBdPhone('+8801711000000')).toBe('01711000000');
    expect(normaliseBdPhone('8801711000000')).toBe('01711000000');
    expect(normaliseBdPhone('01711000000')).toBe('01711000000');
  });
});
