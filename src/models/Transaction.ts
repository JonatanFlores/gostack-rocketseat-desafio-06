import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import Category from './Category';

@Entity('transactions')
class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('enum', { enum: ['income', 'outcome'] })
  type: 'income' | 'outcome';

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  value: number;

  @Column()
  category_id: string;

  // @ManyToOne(() => Category, category => category.transaction, { eager: true })
  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Transaction;
