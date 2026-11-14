import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EmailSyncModule } from '../email-sync/email-sync.module';

@Module({
  imports: [EmailSyncModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
