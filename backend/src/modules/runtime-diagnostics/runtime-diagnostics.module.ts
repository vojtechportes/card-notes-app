import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { RuntimeDiagnosticsService } from './runtime-diagnostics.service'
import { RuntimeExceptionFilter } from './runtime-exception.filter'

@Module({
  providers: [
    RuntimeDiagnosticsService,
    {
      provide: APP_FILTER,
      useClass: RuntimeExceptionFilter,
    },
  ],
  exports: [RuntimeDiagnosticsService],
})
export class RuntimeDiagnosticsModule {}
