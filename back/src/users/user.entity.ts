import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ default: true })
  isActive!: boolean;
}
