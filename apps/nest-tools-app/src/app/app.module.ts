import { Module } from '@nestjs/common';
import { APP_FILTER, HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from '@alexdevcave/nest-tools';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ErrorsController } from './errors/errors.controller';
import { ErrorsService } from './errors/errors.service';

@Module({
  imports: [],
  controllers: [AppController, ErrorsController],
  providers: [
    AppService,
    ErrorsService,
    {
      provide: APP_FILTER,
      // A factory so the option can come from the environment: LOG_CLIENT_ERRORS=false stops logging 4xx errors.
      useFactory: (host: HttpAdapterHost): AllExceptionsFilter => new AllExceptionsFilter(host, { logClientErrors: process.env['LOG_CLIENT_ERRORS'] !== 'false' }),
      inject: [HttpAdapterHost],
    },
  ],
})
export class AppModule {}
