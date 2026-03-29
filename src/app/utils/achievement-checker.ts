import { SupabaseClient } from '@supabase/supabase-js';
import { ACHIEVEMENTS, AchievementDef } from './achievements';

/**
 * Check and award any newly earned achievements for a user.
 * Lightweight: fetches existing achievements first, only checks conditions for unearned ones.
 * Returns array of newly unlocked achievement definitions.
 */
export async function checkAndAwardAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<AchievementDef[]> {
  try {
    // 1. Fetch user's existing achievements
    const { data: existingAchievements, error: achieveError } = await supabase
      .from('achievements')
      .select('achievement_key')
      .eq('user_id', userId);

    if (achieveError) {
      console.error('Error fetching achievements:', achieveError);
      return [];
    }

    const earnedKeys = new Set(
      (existingAchievements || []).map((a: any) => a.achievement_key)
    );

    // Find unearned achievements
    const unearnedAchievements = ACHIEVEMENTS.filter(a => !earnedKeys.has(a.key));

    if (unearnedAchievements.length === 0) return [];

    // 2. Gather data needed for checks (only query what's needed)
    const neededChecks = new Set(unearnedAchievements.map(a => a.key));

    // Batch: route-related data
    let completedRouteCount = 0;
    let hasLongHaul = false;
    if (neededChecks.has('first_route') || neededChecks.has('ten_routes') || neededChecks.has('hundred_routes') || neededChecks.has('long_haul')) {
      const { count, error: routeCountError } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', true);

      if (!routeCountError) {
        completedRouteCount = count || 0;
      }

      // Check long haul: look for completed routes with money_earned as proxy
      // A route > 2000km earning base ~10000+ money at 5 per km = money_earned > ~10000
      // More accurate: check actual station distances for completed routes
      if (neededChecks.has('long_haul')) {
        // We look for routes where the total distance might exceed 2000km
        // We check all completed routes and calculate distance from station coordinates
        const { data: completedRoutes } = await supabase
          .from('routes')
          .select('all_station_ids')
          .eq('user_id', userId)
          .eq('completed', true)
          .order('created_at', { ascending: false })
          .limit(50);

        if (completedRoutes && completedRoutes.length > 0) {
          // Collect all unique station IDs
          const allStationIds = new Set<string>();
          completedRoutes.forEach((r: any) => {
            (r.all_station_ids || []).forEach((id: string) => allStationIds.add(id));
          });

          if (allStationIds.size > 0) {
            const { data: stations } = await supabase
              .from('stations')
              .select('id, latitude, longitude')
              .in('id', Array.from(allStationIds));

            if (stations) {
              const stationMap: Record<string, { latitude: number; longitude: number }> = {};
              stations.forEach((s: any) => {
                stationMap[s.id] = { latitude: s.latitude, longitude: s.longitude };
              });

              for (const route of completedRoutes) {
                const ids = route.all_station_ids || [];
                let totalDist = 0;
                for (let i = 0; i < ids.length - 1; i++) {
                  const a = stationMap[ids[i]];
                  const b = stationMap[ids[i + 1]];
                  if (a && b) {
                    totalDist += haversineDistance(a.latitude, a.longitude, b.latitude, b.longitude);
                  }
                }
                if (totalDist > 2000) {
                  hasLongHaul = true;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Station count
    let stationCount = 0;
    if (neededChecks.has('five_stations') || neededChecks.has('twenty_stations')) {
      const { count, error: stationCountError } = await supabase
        .from('stations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!stationCountError) {
        stationCount = count || 0;
      }
    }

    // CRH ownership
    let hasCRH = false;
    if (neededChecks.has('first_crh')) {
      const { data: crhVehicles } = await supabase
        .from('vehicles')
        .select('model')
        .eq('user_id', userId)
        .or('model.like.CRH%,model.like.CR%')
        .limit(1);

      hasCRH = (crhVehicles && crhVehicles.length > 0) || false;
    }

    // Speed demon: check if user owns a vehicle with max_speed > 350
    // We check vehicle models against known locomotive data
    let hasSpeedDemon = false;
    if (neededChecks.has('speed_demon')) {
      // High speed models: CRH2C (350), CRH3 (350), CRH380x (380), CR400x (350), CR450x (400)
      const highSpeedModels = ['CRH2C', 'CRH3', 'CRH3C', 'CRH380A', 'CRH380B', 'CRH380C', 'CRH380D', 'CR400AF', 'CR400BF', 'CR450AF', 'CR450BF'];
      const { data: speedVehicles } = await supabase
        .from('vehicles')
        .select('model')
        .eq('user_id', userId)
        .in('model', highSpeedModels)
        .limit(1);

      hasSpeedDemon = (speedVehicles && speedVehicles.length > 0) || false;
    }

    // Level check
    let playerLevel = 1;
    if (neededChecks.has('level_10')) {
      const { data: userData } = await supabase
        .from('users')
        .select('xp')
        .eq('id', userId)
        .single();

      if (userData) {
        playerLevel = Math.floor((userData.xp || 0) / 1000) + 1;
      }
    }

    // 3. Evaluate conditions and award
    const newlyUnlocked: AchievementDef[] = [];

    for (const achievement of unearnedAchievements) {
      let earned = false;

      switch (achievement.key) {
        case 'first_route':
          earned = completedRouteCount >= 1;
          break;
        case 'ten_routes':
          earned = completedRouteCount >= 10;
          break;
        case 'hundred_routes':
          earned = completedRouteCount >= 100;
          break;
        case 'five_stations':
          earned = stationCount >= 5;
          break;
        case 'twenty_stations':
          earned = stationCount >= 20;
          break;
        case 'first_crh':
          earned = hasCRH;
          break;
        case 'long_haul':
          earned = hasLongHaul;
          break;
        case 'speed_demon':
          earned = hasSpeedDemon;
          break;
        case 'level_10':
          earned = playerLevel >= 10;
          break;
      }

      if (earned) {
        // Insert achievement record
        const { error: insertError } = await supabase
          .from('achievements')
          .insert({
            user_id: userId,
            achievement_key: achievement.key,
            unlocked_at: new Date().toISOString(),
          });

        if (insertError) {
          // Might be a duplicate if race condition -- skip
          if (!insertError.message?.includes('duplicate') && !insertError.message?.includes('unique')) {
            console.error(`Error inserting achievement ${achievement.key}:`, insertError);
          }
          continue;
        }

        // Credit rewards to user
        if (achievement.reward_money > 0 || achievement.reward_xp > 0) {
          const { data: currentUser } = await supabase
            .from('users')
            .select('money, xp')
            .eq('id', userId)
            .single();

          if (currentUser) {
            await supabase
              .from('users')
              .update({
                money: Number(currentUser.money) + achievement.reward_money,
                xp: (currentUser.xp || 0) + achievement.reward_xp,
              })
              .eq('id', userId);
          }
        }

        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Achievement check error:', error);
    return [];
  }
}

/**
 * Haversine distance between two coordinates in km
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
