export const getDateTime = (date: Date, time: string): Date => {
  // Extract hours and minutes from the time string
  const [rawHours, rawMinutes] = time.replace(/\s+/g, "").toUpperCase().split(/:|AM|PM/);
  const minutes = parseInt(rawMinutes, 10) || 0;

  let hours = parseInt(rawHours, 10);

  // Adjust hours for AM/PM
  if (time.toUpperCase().includes("PM") && hours !== 12) {
    hours += 12;
  }
  if (time.toUpperCase().includes("AM") && hours === 12) {
    hours = 0;
  }

  // Create a new Date with date parts from `date`
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);

  return newDate;
};
