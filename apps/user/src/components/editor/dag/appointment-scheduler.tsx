import { Button } from "@ui/components/ui/button"

interface AppointmentSchedulerProps {
  times: Date[]
  handleBookAppointment: (readableTime: string) => void
  closeAppointments: () => void
}

const getReadableTime = (time: Date): string => {
  return time.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  })
}

export function AppointmentScheduler({ times, handleBookAppointment }: AppointmentSchedulerProps) {
  return (
    <div className="absolute -top-[4.5rem] left-2">
      <p className="p-1 text-xs text-muted-foreground font-semibold uppercase">
        Book an appointment
      </p>
      <div className="flex gap-2">
        {times.map(time => (
          <Button
            key={time.getMilliseconds()}
            className="py-1 px-2 rounded-lg shadow text-xs"
            onClick={() => handleBookAppointment(getReadableTime(time))}
          >
            {getReadableTime(time)}
          </Button>
        ))}
      </div>
    </div>
  )
}
