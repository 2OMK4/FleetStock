
-- ========================================
-- FLEETSTOCK: START TRIP TRANSACTION
-- ========================================

-- Keep privileged database operations private.
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.start_trip_impl(
    p_vehicle_id UUID,
    p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_trip_id UUID;
    v_entry JSONB;
    v_barcode TEXT;
    v_quantity NUMERIC;
    v_item public.items%ROWTYPE;
    v_seen TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Require a signed-in user.
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Validate input.
    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'Items must be an array';
    END IF;

    IF jsonb_array_length(p_items) < 1
       OR jsonb_array_length(p_items) > 100 THEN
        RAISE EXCEPTION 'A trip requires 1 to 100 items';
    END IF;

    -- Lock the vehicle during trip creation.
    PERFORM 1
    FROM public.vehicles
    WHERE id = p_vehicle_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle not found';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.trips
        WHERE vehicle_id = p_vehicle_id
          AND status = 'out'
    ) THEN
        RAISE EXCEPTION 'Vehicle already has an active trip';
    END IF;

    -- Create the trip.
    INSERT INTO public.trips (vehicle_id)
    VALUES (p_vehicle_id)
    RETURNING id INTO v_trip_id;

    -- Sort barcodes to lock stock in a consistent order.
    FOR v_entry IN
        SELECT e.value
        FROM jsonb_array_elements(p_items) AS e(value)
        ORDER BY lower(btrim(e.value->>'barcode'))
    LOOP
        IF jsonb_typeof(v_entry) <> 'object' THEN
            RAISE EXCEPTION 'Invalid item data';
        END IF;

        v_barcode := lower(btrim(v_entry->>'barcode'));

        IF v_barcode IS NULL
           OR length(v_barcode) = 0
           OR length(v_barcode) > 100 THEN
            RAISE EXCEPTION 'Invalid barcode';
        END IF;

        IF v_barcode = ANY(v_seen) THEN
            RAISE EXCEPTION 'Duplicate item: %', v_barcode;
        END IF;

        v_seen := array_append(v_seen, v_barcode);

        IF jsonb_typeof(v_entry->'quantity') IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'Invalid quantity for %', v_barcode;
        END IF;

        v_quantity := (v_entry->>'quantity')::NUMERIC;

        IF v_quantity <= 0
           OR v_quantity > 9999999999.99
           OR v_quantity <> round(v_quantity, 2) THEN
            RAISE EXCEPTION 'Invalid quantity for %', v_barcode;
        END IF;

        -- Lock and retrieve the inventory item.
        SELECT *
        INTO v_item
        FROM public.items
        WHERE lower(btrim(barcode)) = v_barcode
          AND is_active = TRUE
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item not found: %', v_barcode;
        END IF;

        IF v_item.quantity_on_hand < v_quantity THEN
            RAISE EXCEPTION
                'Insufficient stock for %. Available: %',
                v_barcode,
                v_item.quantity_on_hand;
        END IF;

        -- Deduct warehouse stock.
        UPDATE public.items
        SET quantity_on_hand = quantity_on_hand - v_quantity
        WHERE id = v_item.id;

        -- Record what the vehicle took.
        INSERT INTO public.trip_items (
            trip_id,
            item_id,
            barcode_snapshot,
            name_snapshot,
            unit_snapshot,
            taken_quantity
        )
        VALUES (
            v_trip_id,
            v_item.id,
            v_item.barcode,
            v_item.name,
            v_item.unit,
            v_quantity
        );
    END LOOP;

    RETURN v_trip_id;
END;
$$;

-- Only authenticated users may execute the operation.
REVOKE ALL ON FUNCTION private.start_trip_impl(UUID, JSONB)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.start_trip_impl(UUID, JSONB)
TO authenticated;

-- Public API wrapper: runs with caller permissions.
CREATE OR REPLACE FUNCTION public.start_trip(
    p_vehicle_id UUID,
    p_items JSONB
)
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.start_trip_impl(p_vehicle_id, p_items);
$$;

REVOKE ALL ON FUNCTION public.start_trip(UUID, JSONB)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_trip(UUID, JSONB)
TO authenticated;

-- ========================================
-- FLEETSTOCK: RETURN TRIP TRANSACTION
-- ========================================

BEGIN;

CREATE OR REPLACE FUNCTION private.return_trip_impl(
    p_trip_id UUID,
    p_returns JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_vehicle_id UUID;
    v_trip public.trips%ROWTYPE;
    v_entry JSONB;
    v_line RECORD;
    v_id UUID;
    v_quantity NUMERIC;
    v_seen UUID[] := ARRAY[]::UUID[];
    v_expected INTEGER;
    v_processed INTEGER := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF p_returns IS NULL
       OR jsonb_typeof(p_returns) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Returns must be an array';
    END IF;

    -- Find the vehicle.
    SELECT vehicle_id INTO v_vehicle_id
    FROM public.trips
    WHERE id = p_trip_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip not found';
    END IF;

    -- Lock the vehicle and then the trip.
    -- This coordinates with the start-trip transaction.
    PERFORM 1
    FROM public.vehicles
    WHERE id = v_vehicle_id
    FOR UPDATE;

    SELECT * INTO v_trip
    FROM public.trips
    WHERE id = p_trip_id
    FOR UPDATE;

    IF v_trip.status <> 'out' THEN
        RAISE EXCEPTION 'This trip has already been returned';
    END IF;

    SELECT COUNT(*) INTO v_expected
    FROM public.trip_items
    WHERE trip_id = p_trip_id;

    -- Every item must have a returned quantity,
    -- including zero if nothing came back.
    IF v_expected = 0
       OR jsonb_array_length(p_returns) <> v_expected THEN
        RAISE EXCEPTION
            'Provide a returned quantity for every trip item';
    END IF;

    -- Validate the input and reject duplicates.
    FOR v_entry IN
        SELECT value FROM jsonb_array_elements(p_returns)
    LOOP
        IF jsonb_typeof(v_entry) IS DISTINCT FROM 'object'
           OR jsonb_typeof(v_entry->'trip_item_id')
              IS DISTINCT FROM 'string'
           OR jsonb_typeof(v_entry->'returned_quantity')
              IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'Invalid return data';
        END IF;

        v_id := (v_entry->>'trip_item_id')::UUID;
        v_quantity := (v_entry->>'returned_quantity')::NUMERIC;

        IF v_id = ANY(v_seen) THEN
            RAISE EXCEPTION 'Duplicate trip item';
        END IF;

        v_seen := array_append(v_seen, v_id);

        IF v_quantity < 0
           OR v_quantity > 9999999999.99
           OR v_quantity <> round(v_quantity, 2) THEN
            RAISE EXCEPTION 'Invalid returned quantity';
        END IF;
    END LOOP;

    -- Process items in a consistent lock order.
    FOR v_line IN
        SELECT
            ti.id,
            ti.item_id,
            ti.taken_quantity,
            (e.value->>'returned_quantity')::NUMERIC AS qty
        FROM jsonb_array_elements(p_returns) AS e(value)
        JOIN public.trip_items ti
          ON ti.id = (e.value->>'trip_item_id')::UUID
        WHERE ti.trip_id = p_trip_id
        ORDER BY ti.item_id
    LOOP
        IF v_line.qty > v_line.taken_quantity THEN
            RAISE EXCEPTION
                'Returned quantity cannot exceed taken quantity';
        END IF;

        -- Restore returned stock.
        UPDATE public.items
        SET quantity_on_hand = quantity_on_hand + v_line.qty
        WHERE id = v_line.item_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Inventory item no longer exists';
        END IF;

        -- Record how much came back.
        UPDATE public.trip_items
        SET returned_quantity = v_line.qty
        WHERE id = v_line.id;

        v_processed := v_processed + 1;
    END LOOP;

    IF v_processed <> v_expected THEN
        RAISE EXCEPTION
            'Return list does not match the trip items';
    END IF;

    -- Complete the trip.
    UPDATE public.trips
    SET
        status = 'returned',
        returned_at = clock_timestamp()
    WHERE id = p_trip_id;

    RETURN p_trip_id;
END;
$$;

REVOKE ALL ON FUNCTION private.return_trip_impl(UUID, JSONB)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.return_trip_impl(UUID, JSONB)
TO authenticated;

-- Public RPC entry point.
CREATE OR REPLACE FUNCTION public.return_trip(
    p_trip_id UUID,
    p_returns JSONB
)
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.return_trip_impl(p_trip_id, p_returns);
$$;

REVOKE ALL ON FUNCTION public.return_trip(UUID, JSONB)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.return_trip(UUID, JSONB)
TO authenticated;

COMMIT;
