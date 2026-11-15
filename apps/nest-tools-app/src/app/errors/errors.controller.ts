import { Body, Controller, Get, Param, ParseIntPipe, Post, Res } from '@nestjs/common';
import { ServerResponse } from 'node:http';
import { ErrorsService } from './errors.service';

// Demo of AllExceptionsFilter: business errors come from ErrorsService; the routes that depend on HTTP (pipe, raw response, body) stay here.
@Controller('errors')
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Get('user-not-found')
  public notFound(): never {
    return this.errorsService.findUser();
  }

  @Get('user-with-code')
  public withCode(): never {
    return this.errorsService.findUserWithCode();
  }

  @Get('no-message')
  public noMessage(): never {
    return this.errorsService.lockOrder();
  }

  @Get('items/:id')
  public getItem(@Param('id', ParseIntPipe) id: number): { id: number } {
    return { id };
  }

  @Get('validate-user')
  public validation(): never {
    return this.errorsService.validateUser();
  }

  @Get('custom-error')
  public customError(): never {
    return this.errorsService.applyCoupon();
  }

  @Get('unavailable')
  public unavailable(): never {
    return this.errorsService.checkAvailability();
  }

  @Get('unexpected')
  public unexpected(): never {
    return this.errorsService.connectToDatabase();
  }

  @Get('with-cause')
  public withCause(): never {
    return this.errorsService.loadOrders();
  }

  @Get('thrown-string')
  public thrownString(): never {
    return this.errorsService.failWithText();
  }

  @Get('partial-response')
  public partialResponse(@Res() res: ServerResponse): never {
    res.write('partial');
    throw new Error('Stream failed');
  }

  @Post('echo')
  public echo(@Body() body: unknown): unknown {
    return body;
  }
}
