import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AlertEntity } from './entities/alert.entity';
import { DeviceEntity } from './entities/device.entity';
import { TelemetryEntity } from './entities/telemetry.entity';

const ENTITIES = [TelemetryEntity, DeviceEntity, AlertEntity];

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
            type: 'postgres',
            url: config.getOrThrow<string>('DATABASE_URL'),
            entities: ENTITIES,
            synchronize: false,
          }),
        }),
      ],
    };
  }

  static forFeature(): DynamicModule {
    return TypeOrmModule.forFeature(ENTITIES);
  }
}
