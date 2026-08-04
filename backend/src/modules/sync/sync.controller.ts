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
import { SyncPairingService } from './sync-pairing.service'
import { ConfirmSyncPairingDto } from './types/confirm-sync-pairing.dto'
import { PrepareSyncPairingDto } from './types/prepare-sync-pairing.dto'
import { ResolveSyncConflictDto } from './types/resolve-sync-conflict.dto'
import { SyncCommandDto } from './types/sync-command.dto'
import { SyncCommandEnum } from './types/sync-command-enum'
import { SyncConflictDto } from './types/sync-conflict.dto'
import { SyncConflictResolutionStateEnum } from './types/sync-conflict-resolution-state-enum'
import type { SyncRemoteDocument } from './types/sync-remote-document'
import { SyncPairingOperationDto } from './types/sync-pairing-operation.dto'
import { SyncProviderAvailabilityDto } from './types/sync-provider-availability.dto'
import { SyncStatusDto } from './types/sync-status.dto'
import { SyncTriggerDto } from './types/sync-trigger.dto'
import { SyncTriggerEnum } from './types/sync-trigger-enum'

@ApiTags('synchronization')
@Controller('sync')
export class SyncController {
  constructor(
    @Inject(SyncOrchestrationService)
    private readonly orchestrationService: SyncOrchestrationService,
    @Inject(SyncPairingService)
    private readonly pairingService: SyncPairingService,
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
        this.requireDestructiveConfirmation(body)
        return this.runDisconnectCommand()
      case SyncCommandEnum.Repair:
        return this.runRepairCommand()
      case SyncCommandEnum.SwitchProvider:
        throw new BadRequestException(
          'Provider switching must start with the pairing prepare endpoint.'
        )
      case SyncCommandEnum.Reset:
        this.requireDestructiveConfirmation(body)
        return this.runResetCommand()
    }
  }

  @Get('providers')
  @ApiOperation({ summary: 'List synchronization provider availability' })
  @ApiOkResponse({ type: SyncProviderAvailabilityDto, isArray: true })
  getProviderAvailability(): SyncProviderAvailabilityDto[] {
    return this.pairingService.getProviderAvailability()
  }

  @Post('pairing/prepare')
  @ApiOperation({
    summary: 'Prepare synchronization pairing or provider switch',
  })
  @ApiOkResponse({ type: SyncPairingOperationDto })
  @ApiBody({ type: PrepareSyncPairingDto })
  preparePairing(
    @Body() body: PrepareSyncPairingDto
  ): Promise<SyncPairingOperationDto> {
    return this.pairingService.prepare(body)
  }

  @Get('pairing/:id')
  @ApiOperation({ summary: 'Get synchronization pairing preview and state' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: SyncPairingOperationDto })
  @ApiNotFoundResponse({ description: 'Pairing operation was not found.' })
  getPairing(@Param('id') id: string): SyncPairingOperationDto {
    return this.pairingService.get(id)
  }

  @Post('pairing/:id/confirm')
  @ApiOperation({ summary: 'Confirm synchronization pairing decision' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: SyncPairingOperationDto })
  @ApiBody({ type: ConfirmSyncPairingDto })
  confirmPairing(
    @Param('id') id: string,
    @Body() body: ConfirmSyncPairingDto
  ): Promise<SyncPairingOperationDto> {
    return this.pairingService.confirm(id, body)
  }

  @Post('pairing/:id/cancel')
  @ApiOperation({ summary: 'Cancel synchronization pairing' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: SyncPairingOperationDto })
  cancelPairing(@Param('id') id: string): Promise<SyncPairingOperationDto> {
    return this.pairingService.cancel(id)
  }

  private async runDisconnectCommand(): Promise<SyncStatusDto> {
    await this.pairingService.disconnect()
    return this.orchestrationService.getStatus()
  }

  private async runResetCommand(): Promise<SyncStatusDto> {
    await this.pairingService.reset()
    return this.orchestrationService.getStatus()
  }

  private requireDestructiveConfirmation(body: SyncCommandDto): void {
    if (!body.confirmed) {
      throw new BadRequestException(
        'Destructive synchronization commands require explicit confirmation.'
      )
    }
  }

  private async runRepairCommand(): Promise<SyncStatusDto> {
    await this.pairingService.repair()
    return this.orchestrationService.getStatus()
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
