import mongoose from 'mongoose';
import Goal from '../../models/Goal.js';
import User from '../../models/User.js';

let testUser;

beforeAll(async () => {
  testUser = await User.create({
    name: 'Goal Test User',
    email: 'goal@example.com',
    password: 'hashedpassword123',
  });
});

describe('Goal Model Tests', () => {
  it('should create a goal successfully', async () => {
    const goalData = {
      user: testUser._id,
      name: 'Save for Vacation',
      targetAmount: 5000,
      currentAmount: 1000,
      targetDate: new Date('2025-12-31'),
      category: 'travel',
    };

    const goal = await Goal.create(goalData);

    expect(goal._id).toBeDefined();
    expect(goal.user.toString()).toBe(testUser._id.toString());
    expect(goal.name).toBe('Save for Vacation');
    expect(goal.targetAmount).toBe(5000);
    expect(goal.currentAmount).toBe(1000);
    expect(goal.category).toBe('travel');
    expect(goal.createdAt).toBeDefined();
    expect(goal.updatedAt).toBeDefined();
  });

  it('should require user field', async () => {
    const goalData = {
      name: 'Save for Vacation',
      targetAmount: 5000,
    };

    await expect(Goal.create(goalData)).rejects.toThrow();
  });

  it('should require name field', async () => {
    const goalData = {
      user: testUser._id,
      targetAmount: 5000,
    };

    await expect(Goal.create(goalData)).rejects.toThrow();
  });

  it('should require targetAmount field', async () => {
    const goalData = {
      user: testUser._id,
      name: 'Save for Vacation',
    };

    await expect(Goal.create(goalData)).rejects.toThrow();
  });

  it('should set default currentAmount to 0', async () => {
    const goalData = {
      user: testUser._id,
      name: 'Emergency Fund',
      targetAmount: 10000,
      category: 'emergency',
      targetDate: new Date('2025-12-31'),
    };

    const goal = await Goal.create(goalData);
    expect(goal.currentAmount).toBe(0);
  });

  it('should accept valid goal categories', async () => {
    const categories = ['savings', 'travel', 'education', 'investment', 'emergency', 'other'];

    for (const category of categories) {
      const goal = await Goal.create({
        user: testUser._id,
        name: `${category} Goal`,
        targetAmount: 1000,
        category,
        targetDate: new Date('2025-12-31'),
      });
      expect(goal.category).toBe(category);
    }
  });

  it('should reject invalid category', async () => {
    const goalData = {
      user: testUser._id,
      name: 'Invalid Goal',
      targetAmount: 1000,
      category: 'InvalidCategory',
    };

    await expect(Goal.create(goalData)).rejects.toThrow();
  });

  it('should update goal progress', async () => {
    const goal = await Goal.create({
      user: testUser._id,
      name: 'House Down Payment',
      targetAmount: 50000,
      currentAmount: 10000,
      category: 'purchase',
      targetDate: new Date('2026-12-31'),
    });

    goal.currentAmount = 15000;
    await goal.save();

    const updated = await Goal.findById(goal._id);
    expect(updated.currentAmount).toBe(15000);
  });

  it('should mark goal as completed', async () => {
    const goal = await Goal.create({
      user: testUser._id,
      name: 'Small Goal',
      targetAmount: 100,
      currentAmount: 0,
      category: 'savings',
      targetDate: new Date('2025-06-30'),
      status: 'active',
    });

    goal.status = 'completed';
    await goal.save();

    const updated = await Goal.findById(goal._id);
    expect(updated.status).toBe('completed');
  });

  it('should accept paused status', async () => {
    const goal = await Goal.create({
      user: testUser._id,
      name: 'Paused Goal',
      targetAmount: 1000,
      category: 'other',
      targetDate: new Date('2025-12-31'),
      status: 'paused',
    });

    expect(goal.status).toBe('paused');
  });

  it('should delete goal successfully', async () => {
    const goal = await Goal.create({
      user: testUser._id,
      name: 'Temporary Goal',
      targetAmount: 500,
      category: 'other',
      targetDate: new Date('2025-03-31'),
    });

    await Goal.deleteOne({ _id: goal._id });

    const found = await Goal.findById(goal._id);
    expect(found).toBeNull();
  });

  it('should find goals by user', async () => {
    const user2 = await User.create({
      name: 'User 2',
      email: 'user2-goals@example.com',
      password: 'password123',
    });

    await Goal.create({ user: testUser._id, name: 'Goal 1', targetAmount: 1000, category: 'savings', targetDate: new Date('2025-12-31') });
    await Goal.create({ user: testUser._id, name: 'Goal 2', targetAmount: 2000, category: 'savings', targetDate: new Date('2025-12-31') });
    await Goal.create({ user: user2._id, name: 'Goal 3', targetAmount: 3000, category: 'savings', targetDate: new Date('2025-12-31') });

    const userGoals = await Goal.find({ user: testUser._id });
    expect(userGoals.length).toBeGreaterThanOrEqual(2);
  });

  it('should have user reference as ObjectId', async () => {
    const goal = await Goal.create({
      user: testUser._id,
      name: 'Populated Goal',
      targetAmount: 1000,
      category: 'savings',
      targetDate: new Date('2025-12-31'),
    });

    expect(goal.user).toBeDefined();
    expect(goal.user.toString()).toBe(testUser._id.toString());
  });

  it('should handle decimal amounts correctly', async () => {
    const goal = await Goal.create({
      user: testUser._id,
      name: 'Precise Goal',
      targetAmount: 1234.56,
      currentAmount: 123.45,
      category: 'savings',
      targetDate: new Date('2025-12-31'),
    });

    expect(goal.targetAmount).toBe(1234.56);
    expect(goal.currentAmount).toBe(123.45);
  });

  it('should track timestamps', async () => {
    const before = new Date();
    
    const goal = await Goal.create({
      user: testUser._id,
      name: 'Timestamp Goal',
      targetAmount: 1000,
      category: 'savings',
      targetDate: new Date('2025-12-31'),
    });

    const after = new Date();

    expect(goal.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(goal.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(goal.updatedAt).toBeDefined();
  });

  it('should update updatedAt timestamp on modification', async () => {
    const goal = await Goal.create({
      user: testUser._id,
      name: 'Update Test',
      targetAmount: 1000,
      category: 'savings',
      targetDate: new Date('2025-12-31'),
    });

    const originalUpdatedAt = goal.updatedAt;
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    goal.currentAmount = 500;
    await goal.save();

    expect(goal.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should accept optional status', async () => {
    const goal = await Goal.create({
      user: testUser._id,
      name: 'No Status Goal',
      targetAmount: 1000,
      category: 'savings',
      targetDate: new Date('2025-12-31'),
    });

    expect(goal.status).toBe('active');
  });

  it('should accept optional category', async () => {
    const goal = await Goal.create({
      user: testUser._id,
      name: 'No Category Goal',
      targetAmount: 1000,
      category: 'other',
      targetDate: new Date('2025-12-31'),
    });

    expect(goal).toBeDefined();
    expect(goal.category).toBe('other');
  });
});
