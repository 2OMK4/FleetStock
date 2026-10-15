# FleetStock — Vehicle Inventory Management System

**FleetStock** is a web-based inventory and vehicle trip management application designed to track warehouse stock, assign inventory to vehicles, and reconcile used and returned items.

Built using **Next.js, TypeScript, Tailwind CSS, Supabase, and PostgreSQL**, the system provides inventory management, vehicle management, trip tracking, real-time stock updates, and low-stock notifications.

**Repository:** https://github.com/2OMK4/FleetStock

## Features

### Dashboard
- Overview of active inventory items and registered vehicles
- Active and completed trip statistics
- Low-stock and out-of-stock alerts
- Recent vehicle trip history
- Quick access to inventory, vehicles, and trip management

### Inventory Management
- Add and edit inventory items
- Unique barcode/SKU identification
- Track quantities and measurement units
- Configure low-stock thresholds
- Search and manage inventory
- Archive items without permanently deleting historical records
- Validate quantities and prevent negative warehouse stock

### Vehicle Management
- Register vehicles with a name, registration number, and type
- Edit vehicle information
- Prevent duplicate registration numbers
- Prevent a vehicle from starting overlapping active trips

### Trip Management
- Start trips by selecting a vehicle and inventory items
- Select items from a dropdown or enter their barcodes manually
- Specify quantities taken from the warehouse
- Automatically deduct stock when a trip starts
- Record returned quantities for each item
- Restore returned quantities to warehouse inventory
- Calculate consumed quantities automatically
- View active and completed trip history

**Stock calculation:**

Used Quantity = Taken Quantity − Returned Quantity

Trip operations are handled through PostgreSQL functions to keep related database changes atomic.

### Additional Features
- User authentication with Supabase Auth
- English and Arabic interfaces
- Right-to-left layout support for Arabic
- Light, dark, and system themes
- Responsive interface for desktop and mobile
- Server-side and database-level input validation

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack web application using App Router |
| React | User interface |
| TypeScript | Type-safe application development |
| Tailwind CSS | Styling and responsive layout |
| Supabase | Authentication and database services |
| PostgreSQL | Relational database |
| PostgreSQL Functions (RPC) | Atomic trip and inventory transactions |
| next-intl | English and Arabic translations |
| next-themes | Theme switching |
| Lucide React | Interface icons |

## Requirements

Before running FleetStock, install or prepare:

- Node.js 20.9 or later (a current LTS release is recommended)
- npm
- Git
- A Supabase project
- A supported web browser

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/2OMK4/FleetStock.git
cd FleetStock
```

### 2. Install Dependencies

```bash
npm ci
```

This installs the packages listed in `package-lock.json`.

### 3. Create a Supabase Project

1. Visit https://supabase.com
2. Sign in and create a new project.
3. Wait for the PostgreSQL database to become available.
4. Open the project's SQL Editor.

### 4. Initialize the Database

The repository contains three SQL setup files in the `supabase/` directory.

Run them **in the following order** in the Supabase SQL Editor:

**First: `supabase/schema.sql`**

Creates the database tables, constraints, indexes, and Row Level Security policies.

**Second: `supabase/trip-functions.sql`**

Creates the PostgreSQL functions used to start and return trips.

**Third: `supabase/seed.sql` (optional)**

Adds sample inventory items and vehicles for testing.

Run the schema on a new database. It is not intended to be repeatedly executed as an idempotent migration.

### 5. Configure Environment Variables

Copy `.env.example` to a new file named `.env.local`.

In PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Update `.env.local` with your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Find these values in your Supabase project's API settings.

The second variable can use the appropriate Supabase publishable key, or a legacy anonymous key where supported.

**Security:** Never commit `.env.local`, service-role keys, or database passwords to a public repository.

### 6. Configure Authentication

FleetStock uses Supabase email/password authentication.

For local testing:

1. Configure email authentication in Supabase.
2. Create an authorized test user or enable signup in a controlled test environment.
3. Ensure the Supabase authentication URL configuration includes the application URL.
4. Sign in through `/auth/login`.

For production deployments, disable public signup or implement an approved-user access policy before allowing access to inventory management.

### 7. Start the Development Server

```bash
npm run dev
```

Open:

http://localhost:3000

Sign in to access the FleetStock dashboard.

## How to Use FleetStock

### Manage Inventory

1. Open the **Inventory** page.
2. Add an item with its barcode, name, unit, quantity, and stock threshold.
3. Edit existing items when necessary.
4. Monitor the dashboard for low-stock notifications.

### Register Vehicles

1. Open the **Vehicles** page.
2. Add a vehicle name, registration number, and type.
3. Save the record.
4. The vehicle becomes available when creating trips.

### Start a Trip

1. Open **Start New Trip**.
2. Select an available vehicle.
3. Select an inventory item from the dropdown or enter its barcode.
4. Enter the quantity being taken.
5. Add additional items if needed.
6. Start the trip.

FleetStock deducts the selected quantities from warehouse inventory.

### Return a Trip

1. Open the **Trips** page.
2. Locate the active trip.
3. Enter the returned quantity for each item, including zero for items not returned.
4. Confirm the return.

FleetStock calculates item usage, restores returned stock, and marks the trip as completed.

A completed trip cannot be returned again.

## Database Structure

FleetStock uses four main database tables.

| Table | Description |
|---|---|
| `items` | Inventory items, quantities, units, and stock thresholds |
| `vehicles` | Registered vehicles |
| `trips` | Trip records, status, and departure/return timestamps |
| `trip_items` | Items taken and returned for each trip |

### Database Integrity

The database includes:

- Unique inventory barcodes
- Unique vehicle registration numbers
- Quantity validation constraints
- Foreign-key relationships
- One active trip per vehicle
- Inventory snapshots stored with trip items
- Automatically calculated used quantities
- Row locking and atomic database transactions

### Database Functions

`start_trip(p_vehicle_id, p_items)` validates a trip, deducts inventory quantities, and creates its records.

`return_trip(p_trip_id, p_returns)` validates returned quantities, restores inventory, and completes the trip.

Both functions execute their operations within database transactions.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/items` | Retrieve active inventory items |
| POST | `/api/items` | Create an inventory item |
| PATCH | `/api/items/:id` | Update an inventory item |
| DELETE | `/api/items/:id` | Archive an inventory item |
| GET | `/api/vehicles` | Retrieve vehicles |
| POST | `/api/vehicles` | Create a vehicle |
| PATCH | `/api/vehicles/:id` | Update vehicle information |
| GET | `/api/trips` | Retrieve trips and their items |
| POST | `/api/trips` | Start a trip |
| POST | `/api/trips/:id/return` | Return and reconcile a trip |

Application API routes require an authenticated user.

## Project Structure

```text
FleetStock/
├── app/
│   ├── api/
│   │   ├── items/
│   │   ├── vehicles/
│   │   └── trips/
│   ├── auth/
│   ├── inventory/
│   ├── vehicles/
│   ├── trips/
│   │   └── new/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── dashboard/
│   ├── i18n/
│   │   ├── config.ts
│   │   ├── helpers.ts
│   │   └── messages/
│   │       ├── en.json
│   │       └── ar.json
│   ├── inventory/
│   ├── ui/
│   ├── FleetNavbar.tsx
│   ├── LanguageProvider.tsx
│   └── LanguageSwitcher.tsx
├── lib/
│   └── supabase/
├── supabase/
│   ├── schema.sql
│   ├── trip-functions.sql
│   └── seed.sql
├── .env.example
├── package.json
├── package-lock.json
├── next.config.ts
└── README.md
```

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production server after building |
| `npm run lint` | Run ESLint |

Before submitting changes, run:

```bash
npm run lint
npm run build
```

## Deployment

FleetStock can be deployed using Vercel and a hosted Supabase project.

1. Push the source code to GitHub.
2. Import the repository at https://vercel.com.
3. Configure the two required Supabase environment variables.
4. Deploy the Next.js application.
5. Configure the deployed application URL and relevant authentication redirect URLs in Supabase.
6. Test authentication, inventory management, trip creation, and returns.

Do not expose database administrator credentials or Supabase service-role keys in public environment variables.

## Security Considerations

- Application API routes check user authentication.
- PostgreSQL Row Level Security is enabled for inventory and trip tables.
- Database transactions validate quantities and enforce trip consistency.
- All authenticated users currently share the same inventory permissions.
- This version does not implement separate administrator, manager, and employee roles.
- Public self-registration should be restricted before deploying the application for real operational use.
- Check redistribution rights before publishing or distributing any licensed font assets included with the project.

## Future Improvements

Possible future enhancements include:

- Role-based access control
- Inventory adjustment audit logs
- Exportable reports
- Barcode scanner integration
- Automated tests
- Notifications for low-stock items
- More detailed inventory usage analytics

## Project Repository

Source code: https://github.com/2OMK4/FleetStock

FleetStock is designed as a practical vehicle inventory management application demonstrating full-stack development, relational database design, authentication, and transaction-safe inventory operations.