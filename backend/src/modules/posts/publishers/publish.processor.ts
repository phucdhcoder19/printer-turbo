import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PostPublishService } from "../post-publish.service";

/** Worker chạy job đăng bài đã tới giờ. BullMQ tự gọi process() cho từng job. */
@Processor("publish")
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);

  constructor(private readonly publish: PostPublishService) {
    super();
  }

  async process(job: Job<{ targetId: string }>): Promise<void> {
    this.logger.log(
      `Đăng theo lịch: target ${job.data.targetId} (lần ${job.attemptsMade + 1})`,
    );
    await this.publish.publishTargetById(job.data.targetId);
  }
}
