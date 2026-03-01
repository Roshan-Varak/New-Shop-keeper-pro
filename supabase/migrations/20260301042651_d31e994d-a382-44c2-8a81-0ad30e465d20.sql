
-- 1. Add stock floor constraint to prevent negative stock
ALTER TABLE public.products ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);

-- 2. Create atomic billing RPC function
CREATE OR REPLACE FUNCTION public.create_sale(
  p_bill_number text,
  p_subtotal numeric,
  p_discount numeric,
  p_total numeric,
  p_payment_method text,
  p_customer_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_item jsonb;
  v_product_stock int;
BEGIN
  -- Validate stock for all items first
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock INTO v_product_stock
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;  -- lock the row to prevent race conditions

    IF v_product_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
    END IF;

    IF v_product_stock < (v_item->>'quantity')::int THEN
      RAISE EXCEPTION 'Insufficient stock for product %: available %, requested %',
        v_item->>'name', v_product_stock, (v_item->>'quantity')::int;
    END IF;
  END LOOP;

  -- Create sale record
  INSERT INTO public.sales (bill_number, subtotal, discount, total, payment_method, customer_id)
  VALUES (p_bill_number, p_subtotal, p_discount, p_total, p_payment_method, p_customer_id)
  RETURNING id INTO v_sale_id;

  -- Insert sale items and reduce stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.sale_items (sale_id, product_id, name, quantity, price, total)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_item->>'name',
      (v_item->>'quantity')::int,
      (v_item->>'price')::numeric,
      (v_item->>'total')::numeric
    );

    UPDATE public.products
    SET stock = stock - (v_item->>'quantity')::int
    WHERE id = (v_item->>'product_id')::uuid;
  END LOOP;

  -- Create credit transaction if payment method is Credit
  IF p_payment_method = 'Credit' AND p_customer_id IS NOT NULL THEN
    INSERT INTO public.credit_transactions (customer_id, sale_id, amount, type, note)
    VALUES (p_customer_id, v_sale_id, p_total, 'credit', 'Bill ' || p_bill_number);
  END IF;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'bill_number', p_bill_number);
END;
$$;

-- 3. Drop existing trigger that reduces stock (now handled inside RPC)
DROP TRIGGER IF EXISTS reduce_stock_trigger ON public.sale_items;
