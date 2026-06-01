import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EmailSyncController } from './email-sync.controller';
import { EmailSyncService } from './email-sync.service';

@Module({
  imports: [HttpModule],
  controllers: [EmailSyncController],
  providers: [EmailSyncService],
  exports: [EmailSyncService],
})
export class EmailSyncModule {}
