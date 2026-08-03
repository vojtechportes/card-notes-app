import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import {
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'
import { SyncConflictService } from './sync-conflict.service'
import { SyncOrchestrationService } from './sync-orchestration.service'
import { ResolveSyncConflictDto } from './types/resolve-sync-conflict.dto'
import { SyncCommandDto } from './types/sync-command.dto'
import { SyncCommandEnum } from './types/sync-command-enum'
import { SyncConflictDto } from './types/sync-conflict.dto'
import { SyncConflictResolutionStateEnum } from './types/sync-conflict-resolution-state-enum'
import type { SyncRemoteDocument } from './types/sync-remote-document'
import { SyncStatusDto } from './types/sync-status.dto'
import { SyncTriggerDto } from './types/sync-trigger.dto'
import { SyncTriggerEnum } from './types/sync-trigger-enum'

@ApiTags('synchronization')
@Controller('sync')
export class SyncController {
  constructor(
    @Inject(SyncOrchestrationService)
    private readonly orchestrationService: SyncOrchestrationService,
    @Inject(SyncConflictService)
    private readonly conflictService: SyncConflictService
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get synchronization status' })
  @ApiOkResponse({ type: SyncStatusDto })
  getStatus(): SyncStatusDto {
    return this.orchestrationService.getStatus()
  }

  @Post('run')
  @ApiOperation({ summary: 'Run synchronization now' })
  @ApiOkResponse({ type: SyncStatusDto })
  runNow(): Promise<SyncStatusDto> {
    return this.orchestrationService.trigger(SyncTriggerEnum.Manual)
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Submit a synchronization trigger' })
  @ApiOkResponse({ type: SyncStatusDto })
  @ApiBody({ type: SyncTriggerDto })
  submitTrigger(@Body() body: SyncTriggerDto): Promise<SyncStatusDto> {
    if (!Object.values(SyncTriggerEnum).includes(body?.trigger)) {
      throw new BadRequestException('Synchronization trigger is not supported.')
    }

    return this.orchestrationService.trigger(body.trigger)
  }

  @Post('commands')
  @ApiOperation({ summary: 'Submit a safe synchronization command' })
  @ApiOkResponse({ type: SyncStatusDto })
  @ApiConflictResponse({
    description: 'The command requires the T113 pairing or repair workflow.',
  })
  @ApiBody({ type: SyncCommandDto })
  runCommand(
    @Body() body: SyncCommandDto
  ): SyncStatusDto | Promise<SyncStatusDto> {
    if (!Object.values(SyncCommandEnum).includes(body?.command)) {
      throw new BadRequestException('Synchronization command is not supported.')
    }

    switch (body.command) {
      case SyncCommandEnum.Disconnect:
        return this.orchestrationService.requestDisconnect()
      case SyncCommandEnum.Repair:
        return this.orchestrationService.repair()
      case SyncCommandEnum.SwitchProvider:
        return this.orchestrationService.requestProviderSwitch()
      case SyncCommandEnum.Reset:
        return this.orchestrationService.requestReset()
    }
  }

  @Get('conflicts')
  @ApiOperation({ summary: 'List unresolved synchronization conflicts' })
  @ApiOkResponse({ type: SyncConflictDto, isArray: true })
  listConflicts(): SyncConflictDto[] {
    return this.conflictService.listUnresolved()
  }

  @Get('conflicts/:id')
  @ApiOperation({ summary: 'Get a synchronization conflict' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: SyncConflictDto })
  @ApiNotFoundResponse({ description: 'Conflict was not found.' })
  getConflict(@Param('id') id: string): SyncConflictDto {
    const conflict = this.conflictService.findById(id)
    if (!conflict) {
      throw new NotFoundException(
        `Synchronization conflict ${id} was not found.`
      )
    }

    return conflict
  }

  @Post('conflicts/:id/resolve')
  @ApiOperation({ summary: 'Resolve a synchronization conflict' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: SyncConflictDto })
  @ApiBody({ type: ResolveSyncConflictDto })
  resolveConflict(
    @Param('id') id: string,
    @Body() body: ResolveSyncConflictDto
  ): SyncConflictDto {
    const allowedStates = [
      SyncConflictResolutionStateEnum.ResolvedLocal,
      SyncConflictResolutionStateEnum.ResolvedRemote,
      SyncConflictResolutionStateEnum.ResolvedMerged,
    ]
    if (!allowedStates.includes(body?.resolutionState)) {
      throw new BadRequestException(
        'Synchronization conflict resolution state is not supported.'
      )
    }
    if (
      body.resolutionState === SyncConflictResolutionStateEnum.ResolvedMerged &&
      !body.mergedDocument
    ) {
      throw new BadRequestException(
        'A merged document is required for merged conflict resolution.'
      )
    }

    if (!this.conflictService.findById(id)) {
      throw new NotFoundException(
        `Synchronization conflict ${id} was not found.`
      )
    }

    const conflict = this.conflictService.resolve({
      conflictId: id,
      resolutionState: body.resolutionState,
      mergedDocument: body.mergedDocument as SyncRemoteDocument | undefined,
    })

    void this.orchestrationService.trigger(SyncTriggerEnum.ConflictResolution)

    return conflict
  }
}
