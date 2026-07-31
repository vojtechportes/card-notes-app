import { Controller, Get, Inject, Param, Res } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { AssetsService } from './assets.service'

interface AssetResponse {
  end: (buffer: Buffer) => void
  setHeader: (name: string, value: string) => void
}

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(
    @Inject(AssetsService) private readonly assetsService: AssetsService
  ) {}

  @Get(':assetId/content')
  @ApiOperation({ summary: 'Read verified managed asset content' })
  @ApiParam({ name: 'assetId', description: 'SHA-256 asset id.' })
  @ApiOkResponse({ description: 'Verified image bytes.' })
  getContent(
    @Param('assetId') assetId: string,
    @Res() response: AssetResponse
  ): void {
    const { buffer, record } = this.assetsService.readAsset(assetId)

    response.setHeader('Content-Type', record.mimeType)
    response.setHeader('Content-Length', String(buffer.length))
    response.setHeader('Cache-Control', 'private, max-age=31536000, immutable')
    response.end(buffer)
  }
}
