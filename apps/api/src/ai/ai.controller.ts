import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with Nexo AI CFO' })
  chat(@CurrentUser() user: User, @Body() dto: AiChatDto) {
    return this.aiService.chat(user.id, dto);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get personalized AI insights' })
  getInsights(@CurrentUser() user: User) {
    return this.aiService.getInsights(user.id);
  }

  @Post('insights/generate')
  @ApiOperation({ summary: 'Trigger new insight generation' })
  generateInsights(@CurrentUser() user: User) {
    return this.aiService.generateInsights(user.id);
  }

  @Patch('insights/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss an insight' })
  dismissInsight(@CurrentUser() user: User, @Param('id') id: string) {
    return this.aiService.dismissInsight(user.id, id);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List AI conversations' })
  getConversations(@CurrentUser() user: User) {
    return this.aiService.getConversations(user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation history' })
  getConversation(@CurrentUser() user: User, @Param('id') id: string) {
    return this.aiService.getConversation(user.id, id);
  }
}
