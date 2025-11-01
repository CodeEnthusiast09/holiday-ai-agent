export interface Holiday {
  name: string;
  description: string;
  country: {
    id: string;
    name: string;
  };
  date: {
    iso: string;
    datetime: {
      year: number;
      month: number;
      day: number;
    };
  };
  type: string[];
  locations?: string;
  states?: string | any[];
}

export interface HolidayResponse {
  meta: {
    code: number;
  };
  response: {
    holidays: Holiday[];
  };
}
