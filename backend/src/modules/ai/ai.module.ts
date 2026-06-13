import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiSuggestion } from "./entities/ai-suggestion.entity";

@Module({
  imports: [
    HttpModule.register({ timeout: 120000 }), // qwen3 "thinking" có thể chậm
    TypeOrmModule.forFeature([AiSuggestion]), // để lưu lịch sử gợi ý
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
