import { defineStore } from "pinia";

interface Room {
  id: string;
  [key: string]: any;
}

interface Apartment {
  id: string;
  name: string;
  rooms: Room[];
}

export const useApartmentStore = defineStore("apartment", {
  state: (): { apartment: Apartment } => ({
    apartment: {
      id: "apt-1",
      name: "Xonadon",
      rooms: [],
    },
  }),
  actions: {
    addRoom(room: Room) {
      this.apartment.rooms.push(room);
    },
    removeRoom(id: string) {
      this.apartment.rooms = this.apartment.rooms.filter((r) => r.id !== id);
    },
  },
});
