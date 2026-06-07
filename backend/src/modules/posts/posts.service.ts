import { Injectable } from '@nestjs/common';

/**
 * Logic nghiệp vụ cho bài đăng.
 * Hiện là stub — bước sau sẽ inject Repository<Post> và viết CRUD thật.
 */
@Injectable()
export class PostsService {
  findAll() {
    return {
      message: 'Posts module — CRUD bài đăng sẽ được implement ở bước sau',
      items: [],
    };
  }
}
