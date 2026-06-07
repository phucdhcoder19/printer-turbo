import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Team } from "../../teams/entities/team.entity";
import { User } from "../../users/entities/user.entity";
import { ContentPlan } from "../../content-plans/entities/content-plan.entity";
import { PostStatus } from "../../../common/enums";
import { PostTarget } from "./post-target.entity";
import { PostMedia } from "./post-media.entity";

@Entity("posts")
export class Post {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team: Team;

  @Column({ name: "team_id" })
  teamId: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by" })
  createdBy: User | null;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdById: string | null;

  // Thuộc kế hoạch content nào (null = bài lẻ, không thuộc chiến dịch)
  @ManyToOne(() => ContentPlan, (plan) => plan.posts, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "content_plan_id" })
  contentPlan: ContentPlan | null;

  @Column({ name: "content_plan_id", type: "uuid", nullable: true })
  contentPlanId: string | null;

  @Column()
  title: string;

  // Caption gốc / template — mỗi nền tảng có thể override trong post_targets
  @Column({ name: "base_caption", type: "text", nullable: true })
  baseCaption: string | null;

  @Column({ type: "enum", enum: PostStatus, default: PostStatus.DRAFT })
  status: PostStatus;

  @OneToMany(() => PostTarget, (target) => target.post, { cascade: true })
  targets: PostTarget[];

  @OneToMany(() => PostMedia, (pm) => pm.post)
  media: PostMedia[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
