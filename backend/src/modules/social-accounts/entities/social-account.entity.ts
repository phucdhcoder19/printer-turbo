import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { PlatformConfig } from '../../platform-configs/entities/platform-config.entity';
import { ConnectionStatus, Platform } from '../../../common/enums';

@Entity('social_accounts')
// Tránh kết nối trùng 1 tài khoản nền tảng trong cùng team
@Unique(['teamId', 'platform', 'accountExternalId'])
// Tăng tốc query đếm "x/N connected"
@Index(['teamId', 'connectionStatus'])
export class SocialAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  teamId: string;

  @Column({ type: 'enum', enum: Platform })
  platform: Platform;

  @Column({ name: 'account_name' })
  accountName: string;

  @Column({ name: 'account_external_id', type: 'varchar', nullable: true })
  accountExternalId: string | null;

  // ⚠️ Token nên được mã hoá trước khi lưu (vd: dùng @nestjs/config + crypto)
  @Column({ name: 'access_token', type: 'text', nullable: true })
  accessToken: string | null;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ name: 'token_expires_at', type: 'timestamptz', nullable: true })
  tokenExpiresAt: Date | null;

  // Quyền THỰC SỰ được nền tảng cấp (có thể ít hơn oauth_scopes đã xin)
  @Column({ name: 'granted_scopes', type: 'text', array: true, default: () => "'{}'" })
  grantedScopes: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // ----- Trạng thái kết nối (Buffer-style) -----
  @ManyToOne(() => PlatformConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'platform_config_id' })
  platformConfig: PlatformConfig | null;

  @Column({ name: 'platform_config_id', type: 'uuid', nullable: true })
  platformConfigId: string | null;

  @Column({
    name: 'connection_status',
    type: 'enum',
    enum: ConnectionStatus,
    default: ConnectionStatus.PENDING,
  })
  connectionStatus: ConnectionStatus;

  @Column({ name: 'connected_at', type: 'timestamptz', nullable: true })
  connectedAt: Date | null;

  @Column({ name: 'disconnected_at', type: 'timestamptz', nullable: true })
  disconnectedAt: Date | null;

  @Column({ name: 'last_token_refresh', type: 'timestamptz', nullable: true })
  lastTokenRefresh: Date | null;

  @Column({ name: 'token_error', type: 'text', nullable: true })
  tokenError: string | null;

  @Column({ name: 'profile_url', type: 'varchar', nullable: true })
  profileUrl: string | null;

  @Column({ name: 'profile_image_url', type: 'varchar', nullable: true })
  profileImageUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
