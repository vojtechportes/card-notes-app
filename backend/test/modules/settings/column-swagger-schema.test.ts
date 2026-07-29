import { Module, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { afterEach, describe, expect, it } from 'vitest'
import { ColumnDto } from '../../../src/modules/settings/types/column.dto'
import { CreateColumnDto } from '../../../src/modules/settings/types/create-column.dto'
import { LabelsColumnConfigDto } from '../../../src/modules/settings/types/labels-column-config.dto'
import { UpdateColumnDto } from '../../../src/modules/settings/types/update-column.dto'

@Module({})
class SwaggerTestModule {}

describe('column Swagger schemas', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    await app?.close()
  })

  it('creates polymorphic config schemas without emitted decorator metadata', async () => {
    app = await NestFactory.create(SwaggerTestModule, { logger: false })
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NoteStack API')
      .setVersion('0.1.0')
      .build()
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
      extraModels: [
        ColumnDto,
        CreateColumnDto,
        LabelsColumnConfigDto,
        UpdateColumnDto,
      ],
    })

    for (const schemaName of [
      'ColumnDto',
      'CreateColumnDto',
      'UpdateColumnDto',
    ]) {
      expect(swaggerDocument.components?.schemas?.[schemaName]).toMatchObject({
        properties: {
          config: {
            nullable: true,
            anyOf: [
              { $ref: '#/components/schemas/LabelsColumnConfigDto' },
              { type: 'object', additionalProperties: true },
            ],
          },
        },
      })
    }
  })
})
