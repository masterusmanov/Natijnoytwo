import type { Room, Apartment, Weather } from '../type/types';

export const MATERIAL_PERCENT: Record<Weather, number> = {
  hot: 0.1,
  cold: 0.07,
};

export function roomArea(room: Room): number {
  return room.width * room.height;
}

export function cutoutArea(room: Room): number {
  return room.cutouts.reduce((s, c) => s + c.width * c.height, 0);
}

export function netRoomArea(room: Room): number {
  return roomArea(room) - cutoutArea(room);
}

export function materialArea(room: Room, weather: Weather): number {
  return netRoomArea(room) * (1 - MATERIAL_PERCENT[weather]);
}

export function apartmentTotals(apartment: Apartment, weather: Weather) {
  return apartment.rooms.reduce(
    (acc, r) => {
      acc.room += netRoomArea(r);
      acc.material += materialArea(r, weather);
      return acc;
    },
    { room: 0, material: 0 },
  );
}
