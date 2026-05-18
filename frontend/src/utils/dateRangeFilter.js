export const DATE_RANGE_OPTIONS = [
  { value: "week", label: "Last 7 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "thisYear", label: "This Year" },
  { value: "pastYear", label: "Past Year" },
  { value: "custom", label: "Custom Range" },
];

export const DATE_RANGE_LABELS = {
  week: "Last 7 days",
  thisMonth: "This month",
  thisYear: "This year",
  pastYear: "Past year",
  custom: "Custom range",
};

export const toStartOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const toEndOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const formatDateInputValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const parseDateInputValue = (value, endOfDay = false) => {
  const [yearRaw, monthRaw, dayRaw] = String(value).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const parsed = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const getPresetDateBounds = (range, referenceDate = new Date()) => {
  const now = new Date(referenceDate);
  let endDate = toEndOfDay(now);
  let startDate = toStartOfDay(now);

  switch (range) {
    case "week":
      startDate = toStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      break;
    case "thisMonth":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case "thisYear":
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case "pastYear":
      startDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    default:
      startDate = toStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      break;
  }

  return { startDate, endDate };
};

export const getDateRangeLabel = (range, customRange) => {
  if (range !== "custom") {
    return DATE_RANGE_LABELS[range] || DATE_RANGE_LABELS.week;
  }

  if (!customRange?.startDate || !customRange?.endDate) {
    return DATE_RANGE_LABELS.custom;
  }

  return `${customRange.startDate.toLocaleDateString()} - ${customRange.endDate.toLocaleDateString()}`;
};

export const getRangeBounds = (range, customRange) => {
  if (range === "custom" && customRange?.startDate && customRange?.endDate) {
    return {
      startDate: toStartOfDay(customRange.startDate),
      endDate: toEndOfDay(customRange.endDate),
    };
  }

  return getPresetDateBounds(range);
};

export const getRangeDays = (range, customRange) => {
  const { startDate, endDate } = getRangeBounds(range, customRange);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
};
