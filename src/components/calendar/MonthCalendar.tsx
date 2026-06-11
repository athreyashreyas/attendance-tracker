import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import { toDateKey, DAY_LABELS_SHORT } from '../../utils/dates';

interface MonthCalendarProps {
  month: Date;
  getDots: (dateKey: string) => string[];
  onSelectDay: (dateKey: string) => void;
}

export function MonthCalendar({ month, getDots, onSelectDay }: MonthCalendarProps) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div>
      <div className="mb-2 grid grid-cols-7">
        {DAY_LABELS_SHORT.map((label, i) => (
          <div
            key={i}
            className="text-center font-sans text-[11px] font-medium text-ink-300"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const key = toDateKey(day);
          const inMonth = isSameMonth(day, month);
          const dots = getDots(key);
          const today = isToday(day);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              className="flex flex-col items-center gap-1 py-1.5"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full font-sans text-sm ${
                  today
                    ? 'bg-sage-500 font-semibold text-white'
                    : inMonth
                      ? 'text-ink-900'
                      : 'text-ink-100'
                }`}
              >
                {day.getDate()}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {dots.slice(0, 4).map((color, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
