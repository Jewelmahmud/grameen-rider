# Database Schema Design for Grameen Ride App

## Overview
This schema supports a ride-sharing platform with passengers (riders) and drivers, multiple vehicle types, and various rental options.

**Important**: This schema assumes authentication is handled by a separate Auth Server. All user authentication, login, registration, and roles are managed externally. The Auth Server issues JWT tokens that are validated by this application.

---

## Core Tables

### 1. User Profiles Table
**Note**: This table stores application-specific profile data. The actual user authentication is handled by the Auth Server.

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL, -- Reference to Auth Server's user ID (UUID from Auth Server)
    phone_number VARCHAR(20) UNIQUE NOT NULL, -- Synced from Auth Server (e.g., "+8801722611182")
    email VARCHAR(255), -- Synced from Auth Server
    first_name VARCHAR(100), -- Synced from Auth Server
    last_name VARCHAR(100), -- Synced from Auth Server
    full_name VARCHAR(255) GENERATED ALWAYS AS (COALESCE(first_name || ' ' || last_name, first_name, last_name, '')) STORED, -- Computed from first_name and last_name
    profile_image_url TEXT,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('passenger', 'driver')),
    fcm_token TEXT, -- For push notifications
    language_preference VARCHAR(10) DEFAULT 'bn' CHECK (language_preference IN ('bn', 'en')),
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE, -- Synced from Auth Server
    phone_verified BOOLEAN DEFAULT FALSE, -- Synced from Auth Server
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_auth_user_id (auth_user_id),
    INDEX idx_phone (phone_number),
    INDEX idx_user_type (user_type),
    INDEX idx_fcm_token (fcm_token),
    INDEX idx_is_active (is_active),
    INDEX idx_email (email)
);
```

### 2. Drivers Table
```sql
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry_date DATE,
    vehicle_registration_number VARCHAR(50) UNIQUE NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    total_rides INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    is_online BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT FALSE,
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    current_location_updated_at TIMESTAMP,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(255),
    ifsc_code VARCHAR(20), -- If needed for bank transfers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_profile_id), -- One driver profile per user
    INDEX idx_user_profile_id (user_profile_id),
    INDEX idx_online (is_online, is_available),
    INDEX idx_location (current_latitude, current_longitude) USING GIST,
    INDEX idx_rating (rating),
    INDEX idx_verification_status (verification_status)
);
```

### 3. Vehicles Table
```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN (
        'van', 'rickshaw', 'cng', 'motorcycle', 'auto', 
        'pickup_van', 'car', 'car_rental', 'boat_rental'
    )),
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    seating_capacity INTEGER NOT NULL,
    vehicle_image_url TEXT,
    documents JSONB, -- For registration, insurance, etc. {registration: url, insurance: url, fitness: url}
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_driver_id (driver_id),
    INDEX idx_vehicle_type (vehicle_type),
    INDEX idx_active (is_active),
    INDEX idx_is_verified (is_verified)
);
```

### 4. Trips Table
```sql
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_number VARCHAR(50) UNIQUE NOT NULL, -- Format: TRIP-YYYYMMDD-XXXXXX
    passenger_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES drivers(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
    vehicle_type VARCHAR(20) NOT NULL,
    rental_type VARCHAR(20) NOT NULL CHECK (rental_type IN ('single', 'hourly', 'daily', 'custom')),
    
    -- Location Information
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10,8) NOT NULL,
    pickup_longitude DECIMAL(11,8) NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_latitude DECIMAL(10,8) NOT NULL,
    dropoff_longitude DECIMAL(11,8) NOT NULL,
    
    -- Trip Details
    scheduled_datetime TIMESTAMP,
    passenger_count INTEGER DEFAULT 1 CHECK (passenger_count > 0),
    distance_km DECIMAL(8,2), -- Calculated distance
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    
    -- Pricing
    base_fare DECIMAL(10,2) NOT NULL,
    distance_fare DECIMAL(10,2),
    time_fare DECIMAL(10,2), -- For hourly/daily rentals
    extra_passenger_fare DECIMAL(10,2) DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    promotion_id UUID, -- Reference to promotions table if used
    total_fare DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'mobile_money', 'card', 'bank_transfer')),
    
    -- Trip Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'searching_driver', 'accepted', 'driver_assigned', 
        'driver_arriving', 'driver_arrived', 'in_progress', 'completed', 
        'cancelled', 'disputed'
    )),
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    driver_arrived_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20) CHECK (cancelled_by IN ('passenger', 'driver', 'system')),
    
    -- Ratings and Reviews
    passenger_rating INTEGER CHECK (passenger_rating >= 1 AND passenger_rating <= 5),
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    passenger_review TEXT,
    driver_review TEXT,
    
    -- Additional Info
    special_instructions TEXT,
    custom_rental_details TEXT, -- For custom rental type
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_passenger_id (passenger_id),
    INDEX idx_driver_id (driver_id),
    INDEX idx_status (status),
    INDEX idx_requested_at (requested_at),
    INDEX idx_pickup_location (pickup_latitude, pickup_longitude) USING GIST,
    INDEX idx_dropoff_location (dropoff_latitude, dropoff_longitude) USING GIST,
    INDEX idx_trip_number (trip_number),
    INDEX idx_scheduled_datetime (scheduled_datetime)
);
```

### 5. Trip Tracking Table (Real-time Location Updates)
```sql
CREATE TABLE trip_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    heading DECIMAL(5,2), -- Direction in degrees (0-360)
    speed DECIMAL(5,2), -- Speed in km/h
    accuracy DECIMAL(5,2), -- GPS accuracy in meters
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_trip_id (trip_id),
    INDEX idx_recorded_at (recorded_at),
    INDEX idx_location (latitude, longitude) USING GIST
);

-- Partition by month for better performance (PostgreSQL 10+)
-- CREATE TABLE trip_tracking_2024_01 PARTITION OF trip_tracking 
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 6. Favorite Locations Table
```sql
CREATE TABLE favorite_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    location_type VARCHAR(20) DEFAULT 'other' CHECK (location_type IN ('home', 'work', 'other')),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_profile_id (user_profile_id),
    INDEX idx_location (latitude, longitude) USING GIST,
    INDEX idx_location_type (location_type)
);
```

### 7. Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'trip_confirmed', 'trip_cancelled', 'driver_assigned', 'driver_arriving',
        'driver_arrived', 'trip_started', 'trip_completed', 'payment_received',
        'payment_failed', 'promotion', 'system', 'support_response'
    )),
    data JSONB, -- Additional data payload for deep linking, etc.
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    fcm_sent BOOLEAN DEFAULT FALSE,
    fcm_sent_at TIMESTAMP,
    fcm_message_id VARCHAR(255), -- FCM message ID for tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_profile_id (user_profile_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_notification_type (notification_type),
    INDEX idx_trip_id (trip_id)
);
```

### 8. Ratings Table
```sql
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    rater_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    rated_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    tags JSONB, -- e.g., ['punctual', 'safe', 'friendly', 'clean_vehicle']
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(trip_id, rater_profile_id), -- One rating per trip per user
    INDEX idx_rated_profile_id (rated_profile_id),
    INDEX idx_trip_id (trip_id),
    INDEX idx_rating (rating)
);
```

### 9. Payments Table
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE RESTRICT,
    passenger_profile_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES drivers(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BDT',
    payment_method VARCHAR(20) NOT NULL,
    payment_provider VARCHAR(50), -- e.g., 'bKash', 'Nagad', 'Rocket', 'Stripe'
    transaction_id VARCHAR(255) UNIQUE,
    external_transaction_id VARCHAR(255), -- Transaction ID from payment gateway
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    payment_date TIMESTAMP,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    metadata JSONB, -- Additional payment provider data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_trip_id (trip_id),
    INDEX idx_passenger_profile_id (passenger_profile_id),
    INDEX idx_driver_id (driver_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_payment_date (payment_date)
);
```

### 10. Driver Earnings Table
```sql
CREATE TABLE driver_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2) DEFAULT 0.00,
    commission_amount DECIMAL(10,2) DEFAULT 0.00,
    net_earnings DECIMAL(10,2) NOT NULL,
    payout_status VARCHAR(20) DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
    payout_date TIMESTAMP,
    payment_reference VARCHAR(255),
    payout_method VARCHAR(20) CHECK (payout_method IN ('bank_transfer', 'mobile_money', 'cash')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_driver_id (driver_id),
    INDEX idx_payout_status (payout_status),
    INDEX idx_payout_date (payout_date),
    INDEX idx_trip_id (trip_id)
);
```

### 11. Support Tickets Table
```sql
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'trip_issue', 'payment_issue', 'driver_complaint', 
        'passenger_complaint', 'technical_issue', 'account_issue', 'other'
    )),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to_auth_user_id VARCHAR(255), -- Reference to Auth Server's support staff user ID
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_profile_id (user_profile_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_category (category)
);
```

### 12. Support Messages Table
```sql
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_auth_user_id VARCHAR(255) NOT NULL, -- Reference to Auth Server's user ID
    message TEXT NOT NULL,
    attachments JSONB, -- URLs to attachments
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes for support staff
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_created_at (created_at)
);
```

### 13. Promotions Table
```sql
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2), -- For percentage discounts
    min_trip_amount DECIMAL(10,2) DEFAULT 0.00,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    usage_limit INTEGER, -- Total usage limit (NULL = unlimited)
    usage_count INTEGER DEFAULT 0,
    user_usage_limit INTEGER DEFAULT 1, -- Per user usage limit
    is_active BOOLEAN DEFAULT TRUE,
    applicable_vehicle_types JSONB, -- Array of vehicle types ['cng', 'rickshaw', ...]
    applicable_user_types JSONB, -- Array of user types ['passenger', 'driver']
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_valid_dates (valid_from, valid_until),
    INDEX idx_is_active (is_active)
);
```

### 14. Promotion Usage Table
```sql
CREATE TABLE promotion_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID REFERENCES promotions(id) ON DELETE RESTRICT,
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_promotion_id (promotion_id),
    INDEX idx_user_profile_id (user_profile_id),
    INDEX idx_trip_id (trip_id),
    UNIQUE(promotion_id, user_profile_id, trip_id) -- Prevent duplicate usage per trip
);
```

### 15. System Settings Table
```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    updated_by_auth_user_id VARCHAR(255), -- Reference to Auth Server's admin user ID
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);
```

### 16. Driver Availability History Table (Optional - for analytics)
```sql
CREATE TABLE driver_availability_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    is_online BOOLEAN NOT NULL,
    is_available BOOLEAN NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    vehicle_type VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_driver_id (driver_id),
    INDEX idx_recorded_at (recorded_at),
    INDEX idx_location (latitude, longitude) USING GIST
);
```

---

## Kafka Topics Schema

### 1. trip-events
```json
{
  "event_type": "trip.created|trip.accepted|trip.cancelled|trip.started|trip.completed",
  "trip_id": "uuid",
  "passenger_profile_id": "uuid",
  "driver_id": "uuid",
  "timestamp": "2024-03-25T10:30:00Z",
  "metadata": {
    "status": "pending|accepted|completed|cancelled",
    "trip_number": "TRIP-20240325-000001"
  }
}
```

### 2. location-updates
```json
{
  "driver_id": "uuid",
  "trip_id": "uuid",
  "latitude": 23.8103,
  "longitude": 90.4125,
  "heading": 45.5,
  "speed": 30.2,
  "accuracy": 10.5,
  "timestamp": "2024-03-25T10:30:00Z"
}
```

### 3. notification-events
```json
{
  "user_profile_id": "uuid",
  "auth_user_id": "string",
  "notification_type": "trip_confirmed",
  "title": "string",
  "body": "string",
  "data": {
    "trip_id": "uuid",
    "deep_link": "app://trip/123"
  },
  "priority": "high|normal|low",
  "timestamp": "2024-03-25T10:30:00Z"
}
```

### 4. payment-events
```json
{
  "event_type": "payment.initiated|payment.completed|payment.failed",
  "payment_id": "uuid",
  "trip_id": "uuid",
  "amount": 500.00,
  "currency": "BDT",
  "payment_method": "mobile_money",
  "timestamp": "2024-03-25T10:30:00Z"
}
```

### 5. driver-availability
```json
{
  "driver_id": "uuid",
  "is_online": true,
  "is_available": true,
  "latitude": 23.8103,
  "longitude": 90.4125,
  "vehicle_type": "cng",
  "timestamp": "2024-03-25T10:30:00Z"
}
```

### 6. trip-matching
```json
{
  "trip_id": "uuid",
  "driver_id": "uuid",
  "match_score": 85.5,
  "distance_km": 2.5,
  "estimated_arrival_minutes": 5,
  "timestamp": "2024-03-25T10:30:00Z"
}
```

---

## Indexes and Performance Optimization

### Geospatial Indexes
- Use PostgreSQL PostGIS extension for better geospatial queries
- Create GiST indexes on all location columns

### Composite Indexes
```sql
-- For finding available drivers nearby
CREATE INDEX idx_driver_location_availability 
ON drivers USING GIST (
    point(current_longitude, current_latitude)
) 
WHERE is_online = TRUE AND is_available = TRUE;

-- For trip queries by passenger
CREATE INDEX idx_passenger_trips_status 
ON trips(passenger_id, status, requested_at DESC);

-- For driver trip history
CREATE INDEX idx_driver_trips_status 
ON trips(driver_id, status, requested_at DESC);

-- For active trips lookup
CREATE INDEX idx_active_trips_status 
ON trips(status, requested_at DESC) 
WHERE status IN ('pending', 'accepted', 'driver_assigned', 'driver_arriving', 'in_progress');
```

### Partitioning Strategy
- `trip_tracking` table: Partition by month
- `notifications` table: Partition by month for older notifications (optional)
- `payments` table: Partition by month (optional)
- `driver_availability_history` table: Partition by month

---

## Database Relationships Summary

```
user_profiles (1) ──< (many) trips (passenger)
user_profiles (1) ──< (1) drivers
user_profiles (1) ──< (many) favorite_locations
user_profiles (1) ──< (many) notifications
user_profiles (1) ──< (many) support_tickets
user_profiles (1) ──< (many) ratings (as rater)
user_profiles (1) ──< (many) ratings (as rated)

drivers (1) ──< (many) vehicles
drivers (1) ──< (many) trips
drivers (1) ──< (many) driver_earnings

vehicles (1) ──< (many) trips

trips (1) ──< (many) trip_tracking
trips (1) ──< (1) payments
trips (1) ──< (2) ratings
trips (1) ──< (many) notifications

support_tickets (1) ──< (many) support_messages

promotions (1) ──< (many) promotion_usage
```

---

## Integration with Auth Server

### User Profile Sync
When a user authenticates via the Auth Server:
1. Extract `sub` (user ID) from JWT token payload - this is the `auth_user_id` (UUID)
2. Check if `user_profile` exists with that `auth_user_id`
3. If not exists, create a new profile with data from Auth Server response:
   - `auth_user_id`: from `user.id` (UUID)
   - `email`: from `user.email`
   - `phone_number`: from `user.phone`
   - `first_name`: from `user.firstName`
   - `last_name`: from `user.lastName`
   - `email_verified`: from `user.emailVerified`
   - `phone_verified`: from `user.phoneVerified`
4. If exists, update profile data (optional sync)
5. Update `last_active_at` timestamp

### User Type Assignment
- User type (`passenger` or `driver`) is determined by the application logic
- Can be set when user creates a driver profile
- Or can be synced from Auth Server roles if available

### Data Consistency
- `auth_user_id` is the primary link between Auth Server and this application
- Phone numbers and emails should be kept in sync (optional)
- FCM tokens are managed in this application

---

## Notes

1. **UUID Usage**: Using UUIDs for all primary keys provides better security and distributed system support
2. **Geospatial Queries**: PostgreSQL with PostGIS extension recommended for location-based queries
3. **JSONB Fields**: Used for flexible schema (documents, metadata, attachments)
4. **Soft Deletes**: Consider adding `deleted_at` columns for soft deletes if needed
5. **Audit Trail**: Consider adding audit tables for critical operations (payments, trip cancellations)
6. **Timezone**: All timestamps should be stored in UTC
7. **Constraints**: Foreign key constraints ensure data integrity
8. **Indexes**: Carefully planned indexes for common query patterns
9. **Auth Server Integration**: `auth_user_id` (UUID) is the key field linking to Auth Server's `user.id`
10. **JWT Token**: Contains `sub` field which is the user ID (UUID) - this is the `auth_user_id`
11. **Name Fields**: `first_name` and `last_name` are stored separately, `full_name` is computed (generated column)
12. **User Verification**: `email_verified` and `phone_verified` synced from Auth Server status

---

## Environment Variables

The application should have these environment variables:
```env
AUTH_SERVER_URL=https://auth-server.example.com
AUTH_SERVER_JWT_SECRET=your-jwt-secret  # For local JWT verification (optional)
AUTH_SERVER_VALIDATE_ENDPOINT=/api/auth/validate  # If token validation endpoint exists
AUTH_SERVER_GET_USER_ENDPOINT=/api/auth/users  # If user info endpoint exists
DATABASE_URL=postgresql://user:pass@localhost:5432/grameenride
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
FCM_SERVER_KEY=your-fcm-server-key
```
