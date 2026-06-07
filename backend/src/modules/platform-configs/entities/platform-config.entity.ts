import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Platform } from '../../../common/enums';

/**
 * Cấu hình OAuth cho mỗi nền tảng được hỗ trợ.
 * Admin bật/tắt platform qua is_enabled. UI "More channels" query bảng này.
 */
@Entity('platform_configs')
export class PlatformConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Platform, unique: true })
  platform: Platform;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ name: 'icon_url', type: 'varchar', nullable: true })
  iconUrl: string | null;

  @Column({ name: 'oauth_client_id', type: 'text', nullable: true })
  oauthClientId: string | null;

  // ⚠️ Nên mã hoá trước khi lưu (tầng app), không lưu plaintext.
  @Column({ name: 'oauth_client_secret', type: 'text', nullable: true })
  oauthClientSecret: string | null;

  // Quyền cần xin khi OAuth
  @Column({ name: 'oauth_scopes', type: 'text', array: true, default: () => "'{}'" })
  oauthScopes: string[];

  @Column({ name: 'oauth_auth_url', type: 'varchar', nullable: true })
  oauthAuthUrl: string | null;

  @Column({ name: 'oauth_token_url', type: 'varchar', nullable: true })
  oauthTokenUrl: string | null;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
