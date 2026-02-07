export type Weather = "hot" | "cold";

export interface Segment {
  id: string;
  length: number; // meters
}

export interface Cutout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Partition {
  id: string;
  position: number; // meters from wall
  orientation: "vertical" | "horizontal";
}

export interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  segments: Segment[];
  cutouts: Cutout[];
  partitions: Partition[];
}

export interface Apartment {
  id: string;
  name: string;
  rooms: Room[];
}
