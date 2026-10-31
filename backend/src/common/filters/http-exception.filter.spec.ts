import { HttpException, HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';
import { ArgumentsHost } from '@nestjs/common';

const makeHost = (req: Partial<Request> = {}): ArgumentsHost => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ method: 'GET', url: '/api/test', ...req }),
    }),
  } as unknown as ArgumentsHost;
};

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should handle HttpException with correct status', () => {
    const host = makeHost();
    filter.catch(new NotFoundException('Not found'), host);

    const res = host.switchToHttp().getResponse() as any;
    expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    const body = res.json.mock.calls[0][0];
    expect(body.statusCode).toBe(404);
    expect(body.path).toBe('/api/test');
  });

  it('should handle BadRequestException with message array', () => {
    const host = makeHost();
    filter.catch(
      new BadRequestException({ message: ['field is required'], error: 'Bad Request' }),
      host,
    );

    const res = host.switchToHttp().getResponse() as any;
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = res.json.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(Array.isArray(body.message)).toBe(true);
  });

  it('should handle non-HttpException as 500', () => {
    const host = makeHost();
    filter.catch(new Error('unexpected'), host);

    const res = host.switchToHttp().getResponse() as any;
    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = res.json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
  });

  it('should include code field when present in exception response', () => {
    const host = makeHost();
    filter.catch(
      new HttpException({ message: 'No token', code: 'MISSING_TOKEN', error: 'Unauthorized' }, 401),
      host,
    );

    const res = host.switchToHttp().getResponse() as any;
    const body = res.json.mock.calls[0][0];
    expect(body.code).toBe('MISSING_TOKEN');
  });

  it('should include timestamp in response', () => {
    const host = makeHost();
    filter.catch(new NotFoundException(), host);

    const res = host.switchToHttp().getResponse() as any;
    const body = res.json.mock.calls[0][0];
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });
});
