-- Migration: create atomic order function
create or replace function public.create_order_atomic(p_user_id uuid, p_customer_name text, p_items json)
returns json as $$
declare
  new_order_id uuid;
  item json;
  prod record;
begin
insert into public.orders (user_id, customer_name, order_date) values (p_user_id, p_customer_name, now()) returning public.orders.id into new_order_id;
  for item in select * from json_array_elements(p_items) loop
    select * into prod from public.products where id = (item->>'product_id')::uuid for update;
    if prod.stock < (item->>'quantity')::int then
      raise exception 'insufficient_stock: available=%', prod.stock;
    end if;
    update public.products set stock = stock - (item->>'quantity')::int where id = prod.id;
    insert into public.order_items (order_id, product_id, product_name, quantity, price) values (new_order_id, prod.id, prod.name, (item->>'quantity')::int, (item->>'price')::numeric);
    insert into public.inventory_logs (product_id, user_id, change, reason, source) values (prod.id, p_user_id, -((item->>'quantity')::int), 'sale', 'create_order_atomic');
  end loop;
  return json_build_object('ok', true, 'order_id', new_order_id);
end; $$ language plpgsql;

grant execute on function public.create_order_atomic to authenticated;
