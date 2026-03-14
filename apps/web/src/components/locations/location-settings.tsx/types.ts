export type ID = string;

export interface HolidayBase {
  id: ID;
  name: string;
}

export interface RecurringHoliday extends HolidayBase {
  monthDay: string; // MM-DD
}

export type Holiday = RecurringHoliday;