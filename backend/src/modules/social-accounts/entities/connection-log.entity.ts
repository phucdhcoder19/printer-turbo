import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SocialAccount } from './social-account.entity';
import { User } from '../../users/entities/user.entity';
import { ConnectionLogAction } from '../../../common/enums';

/**
 * Lịch sử kết nối/ngắt/refresh token của 1 tài khoản nền tảng (audit trail).
 */
@Entity('connection_logs')
@Index(['socialAccountId', 'createdAt'])
export class ConnectionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SocialAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'social_account_id' })
  socialAccount: SocialAccount;

  @Column({ name: 'social_account_id' })
  socialAccountId: string;

  @Column({ type: 'enum', enum: ConnectionLogAction })
  action: ConnectionLogAction;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedBy: User | null;

  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedById: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
