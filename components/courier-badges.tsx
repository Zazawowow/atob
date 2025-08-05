'use client';

import { Badge } from '@/components/ui/badge';
import { 
  Bike, 
  Car, 
  Truck, 
  Shield, 
  Star, 
  Zap,
  Award,
  Crown,
  Flame
} from 'lucide-react';

interface CourierBadgesProps {
  trustScore: number;
  deliveryCount: number;
  followers?: number;
  following?: number;
  className?: string;
}

interface BadgeInfo {
  variant: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  requirements: string;
}

export function CourierBadges({ 
  trustScore, 
  deliveryCount, 
  followers = 0, 
  following = 0,
  className = '' 
}: CourierBadgesProps) {
  
  // Determine courier level based on trust score and delivery count
  const getCourierLevel = (): BadgeInfo => {
    if (trustScore >= 4.5 && deliveryCount >= 50) {
      return {
        variant: 'cypherMax',
        label: 'CypherMax',
        icon: <Crown className="h-4 w-4" />,
        description: 'Multi-jurisdictional Heavy Transport',
        requirements: 'Elite courier handling high-value, cross-border deliveries'
      };
    } else if (trustScore >= 4.0 && deliveryCount >= 30) {
      return {
        variant: 'localDriver',
        label: 'Local Driver',
        icon: <Truck className="h-4 w-4" />,
        description: 'Regional Transport Specialist',
        requirements: 'Experienced courier for regional and heavy cargo'
      };
    } else if (trustScore >= 3.5 && deliveryCount >= 20) {
      return {
        variant: 'cypherpunk',
        label: 'Cypherpunk Courier',
        icon: <Zap className="h-4 w-4" />,
        description: 'High Trust, High Value',
        requirements: 'Trusted courier for sensitive and valuable packages'
      };
    } else if (trustScore >= 3.0 && deliveryCount >= 10) {
      return {
        variant: 'novice',
        label: 'Novice Courier',
        icon: <Car className="h-4 w-4" />,
        description: 'Local Delivery Specialist',
        requirements: 'Restaurant deliveries and local shop deliveries'
      };
    } else {
      return {
        variant: 'neophyte',
        label: 'Neophyte',
        icon: <Bike className="h-4 w-4" />,
        description: 'Learning the Trade',
        requirements: 'New courier earning reputation with sponsors'
      };
    }
  };

  // Determine vehicle type based on delivery count and trust
  const getVehicleBadge = (): BadgeInfo | null => {
    if (deliveryCount >= 40 && trustScore >= 4.0) {
      return {
        variant: 'truck',
        label: 'Heavy Transport',
        icon: <Truck className="h-4 w-4" />,
        description: 'Large vehicle certified',
        requirements: 'Authorized for heavy cargo and large deliveries'
      };
    } else if (deliveryCount >= 20 && trustScore >= 3.5) {
      return {
        variant: 'van',
        label: 'Van Driver',
        icon: <Car className="h-4 w-4" />,
        description: 'Medium vehicle certified',
        requirements: 'Authorized for medium cargo and multiple packages'
      };
    } else if (deliveryCount >= 10 && trustScore >= 3.0) {
      return {
        variant: 'car',
        label: 'Car Driver',
        icon: <Car className="h-4 w-4" />,
        description: 'Personal vehicle certified',
        requirements: 'Authorized for standard deliveries'
      };
    } else if (deliveryCount >= 5) {
      return {
        variant: 'bike',
        label: 'Bike Courier',
        icon: <Bike className="h-4 w-4" />,
        description: 'Bicycle certified',
        requirements: 'Authorized for small packages and local deliveries'
      };
    }
    return null;
  };

  // Determine trust level badge
  const getTrustBadge = (): BadgeInfo | null => {
    if (trustScore >= 4.5 && followers >= 100) {
      return {
        variant: 'elite',
        label: 'Elite',
        icon: <Crown className="h-4 w-4" />,
        description: 'Elite Trust Level',
        requirements: 'Highest trust level with extensive network'
      };
    } else if (trustScore >= 4.0 && followers >= 50) {
      return {
        variant: 'verified',
        label: 'Verified',
        icon: <Shield className="h-4 w-4" />,
        description: 'Verified Trust Level',
        requirements: 'Verified courier with strong reputation'
      };
    } else if (trustScore >= 3.5 && deliveryCount >= 15) {
      return {
        variant: 'trusted',
        label: 'Trusted',
        icon: <Star className="h-4 w-4" />,
        description: 'Trusted Courier',
        requirements: 'Reliable courier with good track record'
      };
    }
    return null;
  };

  // Get special achievement badges
  const getAchievementBadges = (): BadgeInfo[] => {
    const achievements: BadgeInfo[] = [];
    
    if (deliveryCount >= 100) {
      achievements.push({
        variant: 'cypherMax',
        label: 'Century',
        icon: <Award className="h-4 w-4" />,
        description: '100+ Deliveries',
        requirements: 'Completed 100 successful deliveries'
      });
    }
    
    if (trustScore >= 4.8) {
      achievements.push({
        variant: 'elite',
        label: 'Perfect',
        icon: <Flame className="h-4 w-4" />,
        description: 'Perfect Rating',
        requirements: 'Maintained exceptional trust score'
      });
    }
    
    if (followers >= 200) {
      achievements.push({
        variant: 'verified',
        label: 'Influencer',
        icon: <Star className="h-4 w-4" />,
        description: 'Network Leader',
        requirements: 'Built extensive courier network'
      });
    }
    
    return achievements;
  };

  const courierLevel = getCourierLevel();
  const vehicleBadge = getVehicleBadge();
  const trustBadge = getTrustBadge();
  const achievementBadges = getAchievementBadges();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Courier Level Badge */}
      <div className="flex items-center gap-3">
        <Badge variant={courierLevel.variant as any} size="lg" className="flex items-center gap-2">
          {courierLevel.icon}
          <span className="font-bold">{courierLevel.label}</span>
        </Badge>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{courierLevel.description}</p>
          <p className="text-xs text-white/60">{courierLevel.requirements}</p>
        </div>
      </div>

      {/* Secondary Badges */}
      <div className="flex flex-wrap gap-2">
        {vehicleBadge && (
          <Badge variant={vehicleBadge.variant as any} className="flex items-center gap-1">
            {vehicleBadge.icon}
            {vehicleBadge.label}
          </Badge>
        )}
        
        {trustBadge && (
          <Badge variant={trustBadge.variant as any} className="flex items-center gap-1">
            {trustBadge.icon}
            {trustBadge.label}
          </Badge>
        )}
        
        {achievementBadges.map((achievement, index) => (
          <Badge 
            key={index}
            variant={achievement.variant as any} 
            className="flex items-center gap-1"
          >
            {achievement.icon}
            {achievement.label}
          </Badge>
        ))}
      </div>

      {/* Progress to next level */}
      <div className="mt-4 p-3 bg-black/20 rounded-lg border border-white/10">
        <p className="text-xs text-white/70 mb-2">Progress to next level:</p>
        <div className="space-y-2">
          {trustScore < 4.5 && (
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Trust Score:</span>
              <span className="text-white">{trustScore.toFixed(1)}/4.5</span>
            </div>
          )}
          {deliveryCount < 50 && (
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Deliveries:</span>
              <span className="text-white">{deliveryCount}/50</span>
            </div>
          )}
          {followers < 100 && (
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Network:</span>
              <span className="text-white">{followers}/100 followers</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 