
-- ==========================================
-- FLEETSTOCK DATABASE SCHEMA
-- ==========================================

-- 1. INVENTORY ITEMS
CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity_on_hand NUMERIC(12,2) NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC(12,2) NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT items_barcode_required CHECK (length(trim(barcode)) > 0),
    CONSTRAINT items_name_required CHECK (length(trim(name)) > 0),
    CONSTRAINT items_unit_required CHECK (length(trim(unit)) > 0),
    CONSTRAINT items_quantity_valid CHECK (quantity_on_hand >= 0),
    CONSTRAINT items_threshold_valid CHECK (low_stock_threshold >= 0)
);

CREATE UNIQUE INDEX items_unique_barcode
ON public.items (lower(trim(barcode)));


-- 2. VEHICLES
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT vehicle_registration_required CHECK (length(trim(registration)) > 0),
    CONSTRAINT vehicle_name_required CHECK (length(trim(name)) > 0),
    CONSTRAINT vehicle_type_required CHECK (length(trim(type)) > 0)
);

CREATE UNIQUE INDEX vehicles_unique_registration
ON public.vehicles (lower(trim(registration)));


-- 3. TRIPS
CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    status TEXT NOT NULL DEFAULT 'out',
    departed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMPTZ,

    CONSTRAINT valid_trip_status
        CHECK (status IN ('out', 'returned')),

    CONSTRAINT valid_trip_dates CHECK (
        (status = 'out' AND returned_at IS NULL)
        OR
        (status = 'returned' AND returned_at IS NOT NULL
         AND returned_at >= departed_at)
    )
);

-- Prevent overlapping active trips for a vehicle.
CREATE UNIQUE INDEX one_active_trip_per_vehicle
ON public.trips (vehicle_id)
WHERE status = 'out';


-- 4. ITEMS BELONGING TO TRIPS
CREATE TABLE public.trip_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id),
    item_id UUID NOT NULL REFERENCES public.items(id),

    -- Preserve item information for history.
    barcode_snapshot TEXT NOT NULL,
    name_snapshot TEXT NOT NULL,
    unit_snapshot TEXT NOT NULL,

    taken_quantity NUMERIC(12,2) NOT NULL,
    returned_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,

    used_quantity NUMERIC(12,2)
        GENERATED ALWAYS AS
        (taken_quantity - returned_quantity) STORED,

    CONSTRAINT positive_taken_quantity
        CHECK (taken_quantity > 0),

    CONSTRAINT valid_returned_quantity
        CHECK (
            returned_quantity >= 0
            AND returned_quantity <= taken_quantity
        ),

    CONSTRAINT unique_item_per_trip
        UNIQUE (trip_id, item_id)
);


-- ==========================================
-- SECURITY
-- ==========================================

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_items ENABLE ROW LEVEL SECURITY;

-- Authenticated staff share one store inventory.
CREATE POLICY "Read items" ON public.items
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Create items" ON public.items
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Edit items" ON public.items
FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Read vehicles" ON public.vehicles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Create vehicles" ON public.vehicles
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Edit vehicles" ON public.vehicles
FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- Trip modifications will use validated database functions.
CREATE POLICY "Read trips" ON public.trips
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Read trip items" ON public.trip_items
FOR SELECT TO authenticated USING (true);
