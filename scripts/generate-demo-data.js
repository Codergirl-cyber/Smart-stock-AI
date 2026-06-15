/* global process */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const DEMO_USER_ID = process.env.DEMO_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE environment variable.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

async function getDemoUserId() {
  if (DEMO_USER_ID) return DEMO_USER_ID;
  const { data, error } = await supabase.from('auth.users').select('id').limit(1).single();
  if (error) {
    throw new Error(`Unable to fetch demo user id: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error('No auth.user row found. Set DEMO_USER_ID to a valid user id and re-run.');
  }
  return data.id;
}

async function seedProducts(userId) {
  const productTemplates = [
    { name: 'Executive Notebook', category: 'Stationery', price: 14.99, stock: 12, reorder_level: 8 },
    { name: 'Premium Pen Set', category: 'Stationery', price: 12.75, stock: 9, reorder_level: 6 },
    { name: 'Business Planner', category: 'Stationery', price: 29.5, stock: 18, reorder_level: 10 },
    { name: 'Wireless Charger', category: 'Electronics', price: 34.9, stock: 42, reorder_level: 12 },
    { name: 'USB-C Cable', category: 'Electronics', price: 8.5, stock: 65, reorder_level: 20 },
    { name: 'Bluetooth Speaker', category: 'Electronics', price: 58.0, stock: 22, reorder_level: 10 },
    { name: 'Desk Lamp', category: 'Office', price: 24.4, stock: 30, reorder_level: 12 },
    { name: 'Packing Tape', category: 'Office', price: 6.25, stock: 52, reorder_level: 15 },
    { name: 'Shipping Box Kit', category: 'Office', price: 18.0, stock: 44, reorder_level: 18 },
    { name: 'Coffee Mug', category: 'Merch', price: 11.2, stock: 16, reorder_level: 8 },
    { name: 'Branded Hoodie', category: 'Merch', price: 49.9, stock: 10, reorder_level: 6 },
    { name: 'Smart Thermostat', category: 'Electronics', price: 129.0, stock: 8, reorder_level: 6 },
    { name: 'Noise Cancelling Headphones', category: 'Electronics', price: 99.9, stock: 14, reorder_level: 10 },
    { name: 'Executive Notebook Bundle', category: 'Stationery', price: 39.9, stock: 6, reorder_level: 5 },
    { name: 'Compact Calculator', category: 'Office', price: 9.9, stock: 28, reorder_level: 12 },
    { name: 'Ergonomic Mouse', category: 'Electronics', price: 25.0, stock: 35, reorder_level: 12 },
    { name: 'Monitoring Notebook', category: 'Stationery', price: 19.0, stock: 11, reorder_level: 7 },
    { name: 'Productivity Sticker Pack', category: 'Merch', price: 6.0, stock: 40, reorder_level: 18 },
    { name: 'Desk Organizer', category: 'Office', price: 17.5, stock: 24, reorder_level: 12 },
    { name: 'Laptop Stand', category: 'Office', price: 34.0, stock: 20, reorder_level: 10 }
  ];

  const { data: existing } = await supabase
    .from('products')
    .select('id,name')
    .eq('user_id', userId);

  const existingNames = new Set((existing || []).map((item) => item.name));
  const records = productTemplates
    .filter((template) => !existingNames.has(template.name))
    .map((template) => ({
      ...template,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  if (records.length === 0) {
    console.log('Demo products already exist for this user.');
  } else {
    const { error } = await supabase.from('products').insert(records);
    if (error) throw error;
    console.log(`Inserted ${records.length} demo products.`);
  }

  const { data: allProducts } = await supabase
    .from('products')
    .select('id,name,price,stock,reorder_level')
    .eq('user_id', userId);

  return allProducts || [];
}

async function seedSalesHistory(userId, products) {
  const now = new Date();
  const startDate = addDays(now, -59);
  const customerNames = ['Asha', 'Ravi', 'Priya', 'Kunal', 'Nisha', 'Arun', 'Mira', 'Dev', 'Sofia', 'Jai'];
  const highVelocity = products.slice(0, 5);
  const mediumVelocity = products.slice(5, 12);
  const slowVelocity = products.slice(12);

  const orders = [];
  for (let i = 0; i < 200; i += 1) {
    const dayOffset = Math.floor(Math.random() * 60);
    const orderDate = formatDate(addDays(startDate, dayOffset));
    const group = Math.random() < 0.55 ? highVelocity : Math.random() < 0.75 ? mediumVelocity : slowVelocity;
    const product = randomChoice(group);
    const maxQuantity = Math.min(4, Math.max(1, Math.floor(product.stock / 6) || 1));
    const quantity = clamp(Math.ceil(Math.random() * 3), 1, maxQuantity);
    const price = Number(product.price) || 10;
    const orderAmount = Number((price * quantity).toFixed(2));
    const customer = randomChoice(customerNames);
    const payment_status = Math.random() < 0.9 ? 'paid' : 'unpaid';
    const delivery_status = payment_status === 'paid' ? randomChoice(['delivered', 'shipped']) : 'pending';

    const newStock = Math.max(0, product.stock - quantity);
    product.stock = newStock;

    orders.push({
      id: crypto.randomUUID(),
      user_id: userId,
      customer_name: customer,
      product_name: product.name,
      product_id: product.id,
      quantity,
      price: orderAmount,
      payment_status,
      delivery_status,
      order_date: orderDate,
      created_at: `${orderDate}T12:00:00Z`,
      updated_at: `${orderDate}T12:00:00Z`,
    });
  }

  const { error: ordersError } = await supabase.from('orders').insert(orders);
  if (ordersError) throw ordersError;
  console.log(`Inserted ${orders.length} demo orders.`);

  const orderItems = orders.map((order) => ({
    id: crypto.randomUUID(),
    order_id: order.id,
    product_id: order.product_id,
    quantity: order.quantity,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  const transactions = orders.map((order) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    order_id: order.id,
    type: 'sale',
    amount: order.price,
    status: 'success',
    created_at: order.created_at,
    updated_at: order.updated_at,
  }));

  const { error: txError } = await supabase.from('transactions').insert(transactions);
  if (txError) throw txError;

  const inventoryLogs = orders.map((order) => ({
    id: crypto.randomUUID(),
    product_id: order.product_id,
    change_type: 'OUT',
    quantity: order.quantity,
    created_at: order.created_at,
    user_id: userId,
  }));

  const { error: invError } = await supabase.from('inventory_logs').insert(inventoryLogs);
  if (invError) throw invError;

  for (const product of products) {
    await supabase.from('products').update({ stock: product.stock }).eq('id', product.id);
  }

  console.log('Sales history and inventory logs seeded.');
}

async function seedAgentActivity(userId, products) {
  const lowProducts = products.filter((p) => Number(p.stock) <= Number(p.reorder_level || 2)).slice(0, 4);
  const highDemand = products.sort((a,b)=> b.stock - a.stock).slice(0, 4);

  const tasks = [
    ...lowProducts.map((product, idx) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      agent_name: 'Low Stock Agent',
      task_type: 'low_stock',
      priority: 'high',
      status: idx === 0 ? 'processing' : 'completed',
      description: `${product.name} stock is below reorder level (${product.stock}).`,
      meta: { productId: product.id, stock: product.stock },
      created_by: 'system',
      created_at: new Date(Date.now() - (idx + 1) * 3600 * 1000).toISOString(),
    })),
    ...highDemand.map((product, idx) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      agent_name: 'Demand Spike Agent',
      task_type: 'demand_spike',
      priority: 'medium',
      status: 'completed',
      description: `Demand is increasing for ${product.name}.`,
      meta: { productId: product.id, last: 48, prev: 20 },
      created_by: 'system',
      created_at: new Date(Date.now() - (idx + 2) * 7200 * 1000).toISOString(),
    })),
  ];

  const { error: taskError } = await supabase.from('agent_tasks').insert(tasks);
  if (taskError) throw taskError;

  const logs = tasks.map((task, idx) => ({
    id: crypto.randomUUID(),
    task_id: task.id,
    user_id: userId,
    agent_name: task.agent_name,
    status: task.status === 'completed' ? 'completed' : 'processing',
    result: task.status === 'completed' ? { message: `Automatically processed ${task.agent_name} task.` } : { message: 'Queued for execution.' },
    created_by: 'system',
    created_at: new Date(Date.now() - (idx + 1) * 3600 * 1000).toISOString(),
  }));

  const { error: logError } = await supabase.from('agent_execution_logs').insert(logs);
  if (logError) throw logError;

  console.log(`Inserted ${tasks.length} demo agent tasks and execution logs.`);
}

async function run() {
  try {
    const userId = await getDemoUserId();
    console.log(`Using demo user ${userId}`);
    const products = await seedProducts(userId);
    await seedSalesHistory(userId, products);
    await seedAgentActivity(userId, products);
    console.log('Demo data generation complete. Open the dashboard to validate AI insights.');
  } catch (error) {
    console.error('Demo data generation failed:', error.message || error);
    process.exit(1);
  }
}

run();
