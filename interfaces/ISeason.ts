export interface ISeason {
  seasonId: string;
  seasonName: string;
  isCurrent: boolean;
  startDate?: Date;
  endDate?: Date;
  lastUpdated: Date;
}
