import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { AiSuggestion } from "./entities/ai-suggestion.entity";
import { AiSuggestionType, Platform } from "../../common/enums";

interface CaptionInput {
  topic: string;
  platform?: Platform;
  tone?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @InjectRepository(AiSuggestion)
    private suggestionRepo: Repository<AiSuggestion>,
  ) {
    this.baseUrl = this.config.get<string>(
      "llm.baseUrl",
      "http://localhost:11434/v1",
    );
    this.model = this.config.get<string>("llm.model", "qwen3:4b");
    this.apiKey = this.config.get<string>("llm.apiKey", "ollama");
  }

  async caption(input: CaptionInput, userId?: string) {
    if (!input.topic?.trim()) {
      throw new BadRequestException("Thiếu chủ đề (topic) để AI gợi ý");
    }
    const prompt = this.buildPrompt(input);
    const raw = await this.callLlm(prompt);
    const result = this.parseCaption(raw);

    // Lưu lịch sử (best-effort — lỗi lưu không làm hỏng response)
    this.suggestionRepo
      .save(
        this.suggestionRepo.create({
          type: AiSuggestionType.CAPTION,
          platform: input.platform ?? null,
          inputPrompt: prompt,
          output: result,
          model: this.model,
          createdById: userId ?? null,
        }),
      )
      .catch((e) =>
        this.logger.warn(`Không lưu được AiSuggestion: ${e.message}`),
      );

    return result;
  }

  private buildPrompt({ topic, platform, tone }: CaptionInput): string {
    const platformLine = platform
      ? `Nền tảng: ${platform}`
      : "Nền tảng: mạng xã hội nói chung";
    const toneLine = tone
      ? `Giọng điệu: ${tone}`
      : "Giọng điệu: tự nhiên, cuốn hút";
    return `Bạn là chuyên gia content marketing mạng xã hội.
Viết caption cho bài đăng về chủ đề: "${topic}"
${platformLine}
${toneLine}

YÊU CẦU:
- Caption tiếng Việt, ngắn gọn (2-4 câu), có emoji hợp lý, có call-to-action.
- Kèm 5-8 hashtag liên quan (mỗi hashtag bắt đầu bằng #).

TRẢ VỀ: chỉ JSON object, KHÔNG kèm text khác. Định dạng:
{"caption": "...", "hashtags": ["#a", "#b"]}`;
  }

  private async callLlm(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    try {
      const res = await firstValueFrom(
        this.http.post(
          url,
          {
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 8000, // qwen3 nghĩ (thinking) ăn token → để rộng
          },
          { headers: { Authorization: `Bearer ${this.apiKey}` } },
        ),
      );
      return res.data?.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response) {
        throw new HttpException(
          axiosErr.response.data as Record<string, unknown>,
          axiosErr.response.status,
        );
      }
      this.logger.error(`Không gọi được LLM tại ${url}: ${axiosErr.message}`);
      throw new InternalServerErrorException(
        "Không kết nối được tới LLM (Ollama). Ollama đã chạy chưa?",
      );
    }
  }

  // Bỏ <think>...</think> của qwen3, bỏ ```json fences, rồi parse JSON object.
  private parseCaption(text: string): { caption: string; hashtags: string[] } {
    let t = (text ?? "").trim();
    t = t.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (t.startsWith("```")) {
      t = t
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/```$/, "")
        .trim();
    }

    let obj: { caption?: unknown; hashtags?: unknown };
    try {
      obj = JSON.parse(t);
    } catch {
      const m = t.match(/\{[\s\S]*\}/); // trích object đầu tiên trong text thừa
      if (!m)
        throw new InternalServerErrorException(
          "AI trả về không đúng định dạng",
        );
      obj = JSON.parse(m[0]);
    }

    const caption = typeof obj.caption === "string" ? obj.caption.trim() : "";
    const hashtags = Array.isArray(obj.hashtags)
      ? obj.hashtags
          .map((h) => String(h).trim())
          .filter(Boolean)
          .map((h) => (h.startsWith("#") ? h : `#${h}`))
      : [];
    return { caption, hashtags };
  }
}
