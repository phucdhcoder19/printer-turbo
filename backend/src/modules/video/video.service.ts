import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import { CreateVideoDto } from './dto/create-video.dto';

/**
 * Lớp proxy sang FastAPI video pipeline.
 *
 * TẠI SAO cần proxy thay vì cho React gọi thẳng FastAPI?
 *  → 1 cửa vào duy nhất cho frontend (chỉ cần biết NestJS).
 *  → NestJS gắn được auth/JWT, rate-limit, log, validate trước khi đẩy đi.
 *  → Sau này muốn lưu lịch sử "video đã tạo" vào Postgres → chèn ở đây.
 */
@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly fastapiUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.fastapiUrl = this.config.get<string>(
      'fastapi.url',
      'http://localhost:8080',
    );
  }

  /** POST /api/v1/videos trên FastAPI → trả về { task_id, state, progress } */
  async createVideo(dto: CreateVideoDto) {
    return this.forward('post', '/api/v1/videos', dto);
  }

  /** GET /api/v1/tasks/{id} trên FastAPI → trả về tiến độ task */
  async getTask(taskId: string) {
    return this.forward('get', `/api/v1/tasks/${taskId}`);
  }

  /**
   * Hàm gọi HTTP chung — gom xử lý lỗi về 1 chỗ.
   * Nếu FastAPI trả lỗi (4xx/5xx) → ánh xạ lại thành HttpException của NestJS
   * để React nhận đúng status code.
   */
  private async forward(method: 'get' | 'post', path: string, data?: unknown) {
    const url = `${this.fastapiUrl}${path}`;
    try {
      const response = await firstValueFrom(
        method === 'get'
          ? this.http.get(url)
          : this.http.post(url, data),
      );
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;

      if (axiosErr.response) {
        // FastAPI có phản hồi nhưng là lỗi → chuyển nguyên status + body
        this.logger.warn(
          `FastAPI ${method.toUpperCase()} ${path} → ${axiosErr.response.status}`,
        );
        throw new HttpException(
          axiosErr.response.data as Record<string, unknown>,
          axiosErr.response.status,
        );
      }

      // Không kết nối được (FastAPI chưa chạy / sai URL)
      this.logger.error(`Không gọi được FastAPI tại ${url}: ${axiosErr.message}`);
      throw new InternalServerErrorException(
        'Không kết nối được tới FastAPI video pipeline',
      );
    }
  }
}
