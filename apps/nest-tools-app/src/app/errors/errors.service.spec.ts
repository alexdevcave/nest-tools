import { BadRequestException, ConflictException, HttpException, InternalServerErrorException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from './errors.service';

// Returns what the action throws, so each test can check the exact value.
function thrownBy(action: () => never): unknown {
  try {
    action();
  } catch (error: unknown) {
    return error;
  }
  throw new Error('Expected the action to throw');
}

describe('ErrorsService', (): void => {
  let service: ErrorsService;

  beforeAll(async (): Promise<void> => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [ErrorsService],
    }).compile();

    service = app.get<ErrorsService>(ErrorsService);
  });

  it('FR-2 findUser throws a NotFoundException with its message', (): void => {
    const error: unknown = thrownBy((): never => service.findUser());

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toEqual({ statusCode: 404, message: 'User not found', error: 'Not Found' });
  });

  it('FR-2 findUserWithCode throws a NotFoundException whose body has the message and the code', (): void => {
    const error: unknown = thrownBy((): never => service.findUserWithCode());

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toEqual({ message: 'User not found', code: 'USER_NOT_FOUND' });
  });

  it('FR-2 edge case 2 lockOrder throws a ConflictException whose body has only the code', (): void => {
    const error: unknown = thrownBy((): never => service.lockOrder());

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual({ code: 'ORDER_LOCKED' });
  });

  it('FR-2 edge case 1 validateUser throws a BadRequestException with the list of messages', (): void => {
    const error: unknown = thrownBy((): never => service.validateUser());

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({ statusCode: 400, message: ['email must be an email', 'name should not be empty'], error: 'Bad Request' });
  });

  it('FR-2 applyCoupon throws a BadRequestException with its own error text', (): void => {
    const error: unknown = thrownBy((): never => service.applyCoupon());

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({ statusCode: 400, message: 'Invalid coupon', error: 'Coupon Error' });
  });

  it('FR-2 edge case 3 checkAvailability throws a ServiceUnavailableException with its message', (): void => {
    const error: unknown = thrownBy((): never => service.checkAvailability());

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({ statusCode: 503, message: 'Maintenance in progress', error: 'Service Unavailable' });
  });

  it('FR-3 connectToDatabase throws a plain Error that is not an HTTP exception', (): void => {
    const error: unknown = thrownBy((): never => service.connectToDatabase());

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(HttpException);
    expect((error as Error).message).toBe('Database connection lost');
  });

  it('FR-4 loadOrders throws an InternalServerErrorException with its message and the connection error as cause', (): void => {
    const error: unknown = thrownBy((): never => service.loadOrders());
    const cause: unknown = (error as InternalServerErrorException).cause;

    expect(error).toBeInstanceOf(InternalServerErrorException);
    // Nest leaves `error` undefined when the options carry a cause but no description; the filter fills it in.
    expect((error as InternalServerErrorException).getResponse()).toEqual({ statusCode: 500, message: 'Could not load orders', error: undefined });
    expect(cause).toBeInstanceOf(Error);
    expect((cause as Error).message).toBe('connect ECONNREFUSED 10.0.0.5:5432');
  });

  it('FR-3 edge case 4 failWithText throws a string instead of an Error', (): void => {
    expect(thrownBy((): never => service.failWithText())).toBe('Something went wrong');
  });
});
