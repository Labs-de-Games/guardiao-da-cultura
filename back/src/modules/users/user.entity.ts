import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import { Role } from "./enums/role.enum";

@Entity()
export class User {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ unique: true })
	email!: string;

	@Column({ unique: true })
	nickname!: string;

	@Column()
	firstName!: string;

	@Column()
	lastName!: string;

	@Column({ type: "date" })
	dateOfBirth!: Date;

	@Column({
		type: "enum",
		enum: Role,
		default: Role.Player,
	})
	role!: Role;

	@Column({ default: false })
	isEmailVerified!: boolean;

	@Column({ default: true })
	isActive!: boolean;

	@Column({ type: "timestamp", nullable: true })
	lastLoginAt!: Date | null;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
