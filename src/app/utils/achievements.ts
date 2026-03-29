export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  reward_money: number;
  reward_xp: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_route', name: '初次旅程', description: '完成第一条路线', reward_money: 1000, reward_xp: 0 },
  { key: 'ten_routes', name: '常规运营', description: '完成10条路线', reward_money: 5000, reward_xp: 0 },
  { key: 'hundred_routes', name: '铁路大亨', description: '完成100条路线', reward_money: 50000, reward_xp: 0 },
  { key: 'five_stations', name: '初具规模', description: '拥有5个车站', reward_money: 3000, reward_xp: 0 },
  { key: 'twenty_stations', name: '全国网络', description: '拥有20个车站', reward_money: 25000, reward_xp: 0 },
  { key: 'first_crh', name: '高速时代', description: '拥有一辆CRH动车组', reward_money: 0, reward_xp: 2000 },
  { key: 'long_haul', name: '长途运输', description: '完成一条超过2000公里的路线', reward_money: 10000, reward_xp: 0 },
  { key: 'speed_demon', name: '速度之王', description: '发车速度超过350km/h', reward_money: 0, reward_xp: 5000 },
  { key: 'level_10', name: '资深铁路人', description: '达到等级10', reward_money: 20000, reward_xp: 0 },
];
