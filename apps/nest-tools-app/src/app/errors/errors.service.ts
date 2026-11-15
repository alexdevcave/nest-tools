import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

/** Business operations of the AllExceptionsFilter demo: each one fails with the error its route shows. */
@Injectable()
export class ErrorsService {
  public findUser(): never {
    throw new NotFoundException('User not found');
  }

  public findUserWithCode(): never {
    throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
  }

  public lockOrder(): never {
    throw new ConflictException({ code: 'ORDER_LOCKED' });
  }

  public validateUser(): never {
    throw new BadRequestException(['email must be an email', 'name should not be empty']);
  }

  public applyCoupon(): never {
    throw new BadRequestException('Invalid coupon', { description: 'Coupon Error' });
  }

  public checkAvailability(): never {
    throw new ServiceUnavailableException('Maintenance in progress');
  }

  public connectToDatabase(): never {
    throw new Error('Database connection lost');
  }

  public loadOrders(): never {
    throw new InternalServerErrorException('Could not load orders', { cause: new Error('connect ECONNREFUSED 10.0.0.5:5432') });
  }

  public failWithText(): never {
    throw 'Something went wrong';
  }
}
