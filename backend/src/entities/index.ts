import { UserProfile } from './user-profile.entity';
import { Driver } from './driver.entity';
import { Vehicle } from './vehicle.entity';
import { Trip } from './trip.entity';
import { TripTracking } from './trip-tracking.entity';
import { FavoriteLocation } from './favorite-location.entity';
import { Notification } from './notification.entity';
import { Rating } from './rating.entity';
import { Payment } from './payment.entity';
import { DriverEarning } from './driver-earning.entity';
import { SupportTicket } from './support-ticket.entity';
import { SupportMessage } from './support-message.entity';
import { Promotion } from './promotion.entity';
import { PromotionUsage } from './promotion-usage.entity';
import { SystemSetting } from './system-setting.entity';
import { DriverAvailabilityHistory } from './driver-availability-history.entity';
import { FareRate } from './fare-rate.entity';
import { Zone } from './zone.entity';
import { RouteFare } from './route-fare.entity';
import { TripOffer } from './trip-offer.entity';
import { AdminAuditLog } from './admin-audit-log.entity';

/** Every TypeORM entity. Used by the app and by the migration data source. */
export const ALL_ENTITIES = [
  UserProfile,
  Driver,
  Vehicle,
  Trip,
  TripTracking,
  FavoriteLocation,
  Notification,
  Rating,
  Payment,
  DriverEarning,
  SupportTicket,
  SupportMessage,
  Promotion,
  PromotionUsage,
  SystemSetting,
  DriverAvailabilityHistory,
  FareRate,
  Zone,
  RouteFare,
  TripOffer,
  AdminAuditLog,
];
