import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { OauthStateStatus, Platform } from '../../../common/enums';

/**
 * Tracking 1 phiên OAuth. state_token gửi lên nền tảng & kiểm tra khi callback
 * → chống CSRF. Hết hạn sau ~5 phút.
 */
@Entity('oauth_states')
@Index(['expiresAt']) // để cron dọn state hết hạn
export class OauthState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  teamId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: Platform })
  platform: Platform;

  @Column({ name: 'state_token', unique: true })
  stateToken: string;

  @Column({ name: 'redirect_url', type: 'varchar', nullable: true })
  redirectUrl: string | null;

  @Column({ type: 'enum', enum: OauthStateStatus, default: OauthStateStatus.PENDING })
  status: OauthStateStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
