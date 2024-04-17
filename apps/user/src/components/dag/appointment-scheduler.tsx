import { Button } from "@ui/components/ui/button"
import { Separator } from "@ui/components/ui/separator"

interface AppointmentSchedulerProps {
  times: Date[]
  handleBookAppointment: (readableTime: string) => void
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
    <div className="absolute bottom-1 left-[2%] z-10 w-[96%] border bg-muted rounded-xl shadow">
      <p className="py-2 px-2 text-muted-foreground font-semibold tracking-wide uppercase text-xs">
        Book Advisor Appointment
      </p>
      <Separator className="" />
      <ul className="flex flex-col gap-2 px-3 py-3 ">
        {times.map(time => (
          <li key={JSON.stringify(time)}>
            <Button
              className="text-sm"
              onClick={() => handleBookAppointment(getReadableTime(time))}
            >
              {getReadableTime(time)}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}